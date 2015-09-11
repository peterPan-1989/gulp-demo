/**
 * Created by ppf on 9/7/15.
 */


var gulp = require('gulp');
var del = require('del');
var less = require('gulp-less');
var path = require('path');
var rename = require('gulp-rename');
var imagemin = require('gulp-imagemin');
var async = require('async');
var cache = require('gulp-cached');
var es = require('event-stream');
var changed = require('gulp-changed');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var preprocess = require('gulp-preprocess');
var csso = require('gulp-csso');
var requirejs   = require('requirejs');
var fs = require('fs');
var slash = require('slash');





//ps:路径不要加./ ，watch不支持
var srcRoot = "src",
    outputRoot = "./output",
    templateDir = outputRoot + '/template',
    env = process.argv[2] === 'pro' ? "pro" : 'dev',
    outputDir = env === "pro" ? outputRoot + "/pro-output" :outputRoot + '/dev-output';



var paths = {
    srcRoot : srcRoot,
    outputRoot : outputRoot,
    outputDir : outputDir,
    imgSrc : [srcRoot+"/img/**",srcRoot+"/+(modules)/*/img/**"],
    imgOutput : outputDir + '/img',
    cssSrc : [srcRoot+"/css/*.less",srcRoot+"/+(modules)/*/css/*.less"],
    cssOutput : outputDir + '/css',
    templateSrc : [srcRoot+"/html/**",srcRoot+"/+(modules)/*/html/**"],
    dataSrc : [srcRoot+"/data/**",srcRoot+"/+(modules)/*/data/**"],
    templateOutput : templateDir,
    jsSrc : [srcRoot+"/js/**",srcRoot+"/+(modules)/*/js/**"],
    jsOutput : outputDir + '/js',
    jsLibSrc : './lib',
    jsTemp : outputRoot + "/js-temp",
    jsLibConfigSrc : srcRoot + '/jsLibConfig.js'
};

//js压缩后，r.js处理后对最终文件进行压缩
var jsConcat = {
    "global.js" : [paths.jsTemp  + "/lib/requirejs/require.js",
        paths.jsOutput  + "/common.js"]
}




gulp.task('clean', function() {
    if(env === "dev"){
        var arr = [paths.outputDir,paths.templateOutput];
    }else{
        var arr = [paths.outputDir,paths.templateOutput,paths.jsTemp];
    }
    return del(arr);
});


function noop(cb){
    cb();
}

/**
 * less
 * 编译less文件并且移动到指定css目录
 */

gulp.task('less', function () {

    var s = gulp.src(paths.cssSrc)
        .pipe(cache('less'))
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes'),paths.srcRoot + '/css' ]
        }));
    s = env === 'pro' ?  s.pipe(csso()) : s ;

    return s.pipe(rename(function(filepath) {
        var res;
        if(res = /^modules\/([^\/]+)\/css/.exec(slash(filepath.dirname) )){
            //filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
            filepath.dirname = ".";
        }else if(filepath.dirname.indexOf("modules") === 0){
            filepath.dirname = "";
            filepath.basename = "";
        }
        //filepath.extname = env === "pro" ? ".min" + filepath.extname : filepath.extname;
    }))
        .pipe(gulp.dest(paths.cssOutput))
});

/**
 * 图片移动，将global和各个模块的图片移动到最终输出目录，
 * 如果时pro模式，将会压缩图片。
 * 最终输出的图片目录如
 * img/xxx.png，全局图片
 * img/{modules}/xxx.png  各个模块的第一层级的图片
 * img/{modules}/{subModules}/xxx.png  各个模块的第二层级的图片
 */

gulp.task('image', function () {
    var s = gulp.src(paths.imgSrc)
        .pipe(rename(function(filepath) {
            var res;
            if(res = /^modules\/([^\/]+)\/img/.exec(slash(filepath.dirname))){
                filepath.dirname = res[1] + "/" + slash(filepath.dirname).replace(res[0],'');
            }else if(filepath.dirname.indexOf("modules") === 0){
                filepath.dirname = "";
                filepath.basename = "";
            }
        }));
    s = env ==='pro' ? s : s.pipe(changed(paths.imgOutput));

    /*s = env === 'pro' ?  s.pipe(imagemin({
     optimizationLevel : 5
     })) : s ;*/

    return  s.pipe(gulp.dest(paths.imgOutput))
});

/**
 * js lib
 * 移动lib里面对应的需要移动的js文件或文件夹，可从jsLib配置
 * 移动的最终位置，dev模式为直接dev－output/js/lib的目录
 * pro模式为output/js－temp的目录，便于r.js处理与js文件合并
 */

gulp.task('jsLib',function(){
    var srcArr = [];
    //js lib 的文件路径，或整个文件夹路径
    var jsLib = require('./' + paths.jsLibConfigSrc);
    delete require.cache[require.resolve('./' + paths.jsLibConfigSrc)];

    jsLib.forEach(function(val){
        srcArr.push(paths.jsLibSrc + "/" +val);
    });

    //console.log("srcArr:" + JSON.stringify(srcArr));


    var jsLibOutput = env === "pro" ? paths.jsTemp+ "/lib" : paths.jsOutput + "/lib";
    //console.log("jsLibOutput:" + jsLibOutput);

    return gulp.src(srcArr)
        .pipe(changed(jsLibOutput))
        .pipe(gulp.dest(jsLibOutput))
});

/**
 * js
 * 移动js目录以及各个模块的js文件
 * 移动的最终位置，dev模式为直接dev－output/js的目录
 * pro模式为output/js－temp的目录，便于r.js处理与js文件合并
 */

gulp.task('js', function () {
    var jsLibOutput = env === "pro" ? paths.jsTemp : paths.jsOutput;

    return  gulp.src(paths.jsSrc)
        .pipe(cache('js'))
        .pipe(rename(function(filepath) {
            var res;
            if(res = /^modules\/([^\/]+)\/js/.exec(slash(filepath.dirname))){
                //console.log(res);
                filepath.dirname = path.normalize(res[1] + "/" + slash(filepath.dirname).replace(res[0],''));
                //console.log(filepath.dirname);
            }else if(filepath.dirname.indexOf("modules") === 0){
                filepath.dirname = "";
                filepath.basename = "";
            }
        }))
        .pipe(gulp.dest(jsLibOutput));
});

/**
 * 1.r.js压缩requirejs,并且生成公用文件，并且去除重复
 * 2.合并某些最终文件，一般是global.js和common.js的合并
 *
 */

gulp.task('pro-js-build',['js','jsLib'], function (cb) {
    async.waterfall([function(icb){
        fs.readdir('./' + paths.srcRoot+"/modules", function(err,arr){
            if(err){
                return icb(err);
            }
            var res = ['./' + paths.srcRoot + '/jsConfig.js'];
            arr.forEach(function(val){
                res.push('./' + paths.srcRoot + '/modules/' + val + '/jsConfig.js');
            });
            var modules = [];
            res.forEach(function(val){
                var moduleItem;
                try{
                    moduleItem = require(val);
                    modules = modules.concat(moduleItem);
                }catch (e){
                    console.error(e);
                }
            })
            icb(null,modules);
        })

    },function(requrejsModule,icb){
        var config = {
            appDir: paths.jsTemp,
            mainConfigFile: paths.jsTemp + "/common.js",
            dir: paths.jsOutput,
            baseUrl : "./",
            modules : requrejsModule};
        fs.writeFile(/*paths.outputDir +*//*paths.srcRoot*/   "./rjsOption.js", JSON.stringify(config), icb);
    },function(icb){
        //console.log(require('os').platform() === 'win32' ? 'r.js.cmd' : 'r.js');
        var spawn = require('child_process').spawn,
            sp    = spawn(require('os').platform() === 'win32' ? 'r.js.cmd' : 'r.js', ['-o', "./rjsOption.js"]);
        sp.stdout.on('data', function (data) {
            console.log('r.js:' + data);
        });
        sp.stderr.on('data', function (data) {
            console.error('r.js: ' + data);
        });
        sp.on('close', function (code) {
            console.log('000');
            icb();
        });

    },function(icb){
        //console.log(123);
        //concat the file js
        var ts = [];
        for(var key in jsConcat){
            ts.push(gulp.src(jsConcat[key])
                .pipe(concat(key))
                .pipe(uglify())
                .pipe(gulp.dest(paths.jsOutput)));
        }
        return es.concat.apply(null, ts).on('end',function(){
            //console.log('concat end');
            icb();
        });
    }],function(err){
        err && console.error(err);
        cb(err);
    });

    return;


});







/**
 * template渲染
 * 引入volecity模版
 * 最终将模版输出到template目录和测试目录
 *
 *
 */

gulp.task('template', function (cb) {
    //移动template到路径上面

    var map = {};

    return gulp.src(paths.templateSrc)
        .pipe(cache('template'))
        .pipe(rename(function(filepath) {
            var oldPath;
            if(filepath.dirname.indexOf("modules") === 0 && filepath.extname === ".html"){
                oldPath = filepath.dirname + "/" + filepath.basename + filepath.extname;
            }
            filepath.dirname = '.';
            if(filepath.extname === ""){
                filepath.basename = '';
            }
            if(oldPath){
                map[oldPath] = filepath.dirname + "/" + filepath.basename + filepath.extname;
            }
        }))
        .pipe(preprocess({context: { NODE_ENV: env, DEBUG: true}})) //To set environment variables in-line
        .pipe(gulp.dest(paths.templateOutput))
        .pipe(es.wait(function (err, body) {
            var Engine = require('velocity').Engine;
            //渲染模版
            for(var oldPath in map){
                var newPath = map[oldPath],
                    data;
                try{
                    var regex = /^modules\/([^\/]+)\/html\/(.+?)\.html$/,
                        pathRes;
                    if(pathRes = regex.exec(slash(oldPath))){
                        var dataPath = './'+paths.srcRoot + "/modules/"+pathRes[1]+"/data/"+pathRes[2]+".js";
                        data = require(dataPath);
                    }else{
                        data = {};
                    }

                }catch (e){
                    console.error(e);
                    if(e.code === 'MODULE_NOT_FOUND'){
                        data = {};
                    }
                }

                //渲染模版
                var engine = new Engine({
                    root: paths.templateOutput,
                    template: paths.templateOutput + "/" +newPath,
                    output: paths.outputDir + "/" + newPath
                });
                var result = engine.render(data);

            }
        }));
});






gulp.task('watch', function() {
    //problem：路径不能存在./这样的当前目录形式，只能形如src/xxx/xx，而不能./src/xxx/xx
    //console.log(paths.imgSrc);
    gulp.watch(paths.imgSrc,['image']);
    gulp.watch(paths.cssSrc,['less']);
    gulp.watch([].concat(paths.templateSrc,paths.dataSrc),['template']);
    //console.log('template watch : ' + JSON.stringify([].concat(paths.templateSrc,paths.dataSrc)) );

    //console.log('jsLib watch : ' + JSON.stringify([].concat([paths.jsLibSrc,paths.jsLibConfigSrc]) ));
    gulp.watch([].concat([paths.jsLibSrc,paths.jsLibConfigSrc]),['jsLib']);
    gulp.watch(paths.jsSrc,['js']);
});


gulp.task('default',['clean'],function(){
    gulp.start(['less','image','template','jsLib','js','watch'])
        .on('stop',function(){

        });
});


gulp.task('pro',[],function(){

    gulp.start(['less','template','image','pro-js-build']);
});


