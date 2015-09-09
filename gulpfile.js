/**
 * Created by ppf on 9/7/15.
 */





var gulp = require('gulp');
var del = require('del');
var less = require('gulp-less');
var path = require('path');
var rename = require('gulp-rename');
//var minifyCSS = require('gulp-minify-css');
var imagemin = require('gulp-imagemin');
var rjs = require('gulp-requirejs');
var async = require('async');
var cache = require('gulp-cached');
var es = require('event-stream');
var changed = require('gulp-changed');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var through2 = require('through2');
var preprocess = require('gulp-preprocess');
var csso = require('gulp-csso');
var requirejs   = require('requirejs');


var srcRoot = "./src",
    templateRoot = './template',
    env = process.argv[2] === 'pro' ? "pro" : 'dev',
    outputRoot = env === "pro" ? "./pro-output" :'./dev-output';



var paths = {
    srcRoot : srcRoot,
    outputRoot : outputRoot,
    imgSrc : [srcRoot+"/img/**",srcRoot+"/+(modules)/*/img/**"],
    imgOutput : outputRoot + '/img',
    cssSrc : [srcRoot+"/css/*.less",srcRoot+"/+(modules)/*/css/*.less"],
    cssOutput : outputRoot + '/css',
    templateSrc : [srcRoot+"/html/**",srcRoot+"/+(modules)/*/html/**"],
    templateOutput : templateRoot,
    jsSrc : [srcRoot+"/js/**",srcRoot+"/+(modules)/*/js/**"],
    jsOutput : outputRoot + '/js',
    jsLibSrc : './lib/**',
    jsTemp : "./js-temp"
};


var jsConcat = {
    "global.js" : [paths.jsTemp  + "/lib/requirejs/require.js",
        paths.jsTemp  + "/common.js"]
}

var jsLib = ['jquery/jquery.js','requirejs/require.js'];

/**
 * 压缩requirejs入口
 * @type {{index/index}}
 */
/*var requireJsArr = [*//*{
    name: './common',
    include: [
        'jquery'
    ]
},*//*{
    name: 'index/index',
    include: []
    //exclude: ["../"+paths.jsOutput + '/common']
}];*/


var requrejsModule = [{
    name: './common',
    include: [
        'jquery'
    ]
},{
    //module names are relative to baseUrl
    name: 'index/aaa/ddd',
    include: [],
    exclude: ['./common']
},{
    //module names are relative to baseUrl/paths config
    name: 'index/index',
    include: [],
    exclude: ['./common']
}];



gulp.task('clean', function() {
    if(env === "dev"){
        var arr = [paths.outputRoot,paths.templateOutput];
    }else{
        var arr = [paths.outputRoot,paths.templateOutput,paths.jsTemp];
    }
    return del(arr);
});


function noop(cb){
    cb();
}

/**
 * less
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
        if(res = /^modules\/([^\/]+)\/css/.exec(filepath.dirname)){
            filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
        }else if(filepath.dirname.indexOf("modules") === 0){
            filepath.dirname = "";
            filepath.basename = "";
        }
        //filepath.extname = env === "pro" ? ".min" + filepath.extname : filepath.extname;
    }))
    .pipe(gulp.dest(paths.cssOutput))
});

/**
 * image
 */

gulp.task('image', function () {
    return gulp.src(paths.imgSrc)

        .pipe(rename(function(filepath) {
            var res;
            if(res = /^modules\/([^\/]+)\/img/.exec(filepath.dirname)){
                filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
            }else if(filepath.dirname.indexOf("modules") === 0){
                filepath.dirname = "";
                filepath.basename = "";
            }
        }))
        .pipe(changed(paths.imgOutput))
        .pipe(imagemin({
            optimizationLevel : 5
        }))
        .pipe(gulp.dest(paths.imgOutput))
});

/**
 * js lib
 */

gulp.task('jsLib',function(){
    var srcArr = [];
    jsLib.forEach(function(val){
        srcArr.push(paths.jsLibSrc + "/" +val);
    });

    var jsLibOutput = env === "pro" ? paths.jsTemp+ "/lib" : paths.jsOutput + "/lib";
    return gulp.src(srcArr)
        .pipe(changed(jsLibOutput))
        .pipe(gulp.dest(jsLibOutput))
});

/**
 * js
 */

gulp.task('js', function () {
    var jsLibOutput = env === "pro" ? paths.jsTemp : paths.jsOutput;

    return  gulp.src(paths.jsSrc)
        .pipe(cache('js'))
        .pipe(rename(function(filepath) {
            var res;
            if(res = /^modules\/([^\/]+)\/js/.exec(filepath.dirname)){
                filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
            }else if(filepath.dirname.indexOf("modules") === 0){
                filepath.dirname = "";
                filepath.basename = "";
            }
        }))
        .pipe(gulp.dest(jsLibOutput));
});

/**
 * r.js压缩requirejs
 */

gulp.task('requirejs-build',['js','jsLib'], function (cb) {
    //console.log(requireJsArr);
    /*async.eachSeries(requireJsArr,function(item,icb){
        console.log(item);
        rjs({
            baseUrl: paths.jsTemp,
            out: item['name'] + ".js",
            mainConfigFile : paths.jsTemp + "/common.js",
            name : item['name'],
            exclude : item['exclude'],
            include : item['include'],
            shim: {
                // standard require.js shim options
            }
        })
            .pipe(through2.obj(function (file, enc, next) {
                this.push(file);
                this.end();
                next();
            }))
            .pipe(uglify())
            .pipe(gulp.dest(paths.jsOutput)).on('end',function(){
                icb();
            });


    },function(err){
        if(err){
            console.log(err);
        }
        cb(err);
    })*/

    async.waterfall([function(icb){
        var fs = require('fs');
        var config = {
            appDir: paths.jsTemp,
            mainConfigFile: paths.jsTemp + "/common.js",
            dir: paths.jsOutput,
            baseUrl : "./",
            modules : requrejsModule};
        fs.writeFile("rjsOption.js", JSON.stringify(config), icb);
    },function(icb){

        var spawn = require('child_process').spawn,
            ls    = spawn('r.js', ['-o', "rjsOption.js"]);

        ls.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });

        ls.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        ls.on('close', function (code) {
            icb
        });

    }],function(err){

        cb(err);

    });

    return;




    /*return requirejs.optimize().on('defined',function(){
        console.log(arguments)
    });*/
    /*.pipe(through2.obj(function (file, enc, next) {
        this.push(file);
        this.end();
        next();
    }))
        .pipe(uglify())
        .pipe(gulp.dest(paths.jsOutput))*/

   /* var ts = [];
    for(var i= 0,length = requireJsArr.length;i<length;i++){
        ts.push(
            rjs({
                baseUrl: paths.jsTemp,
                out: requireJsArr[i]['name'] + ".js",
                mainConfigFile : paths.jsTemp + "/common.js",
                name : requireJsArr[i]['name'],
                exclude : requireJsArr[i]['exclude'],
                include : requireJsArr[i]['include'],
                shim: {
                    // standard require.js shim options
                }
            })
                .pipe(through2.obj(function (file, enc, next) {
                    this.push(file);
                    this.end();
                    next();
                }))
                .pipe(uglify())
                .pipe(gulp.dest(paths.jsOutput))
        );
    }

    return es.concat.apply(null, ts);*/

});



gulp.task('jsConcat',['js','jsLib'],function(){

    var ts = [];
    for(var key in jsConcat){
        ts.push(gulp.src(jsConcat[key])
            .pipe(concat(key))
            .pipe(uglify())
            .pipe(gulp.dest(paths.jsOutput)));
    }
    return es.concat.apply(null, ts);

    /*return gulp.src([paths.jsOutput  + "/lib/requirejs/require.js",
        paths.jsOutput  + "/config.js"])
        .pipe(concat())
        .pipe(gulp.dest(paths.jsOutput));*/

})



/**
 * template
 * 引入volecity模版
 *
 *
 */

gulp.task('template', function (cb) {
    //移动template到路径上面

    var map = {};

    return gulp.src(paths.templateSrc)
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
                    if(pathRes = regex.exec(oldPath)){
                        data = require(paths.srcRoot + "/modules/"+pathRes[1]+"/data/"+pathRes[2]+".js");
                    }else{
                        data = {};
                    }

                }catch (e){
                    if(e.code === 'MODULE_NOT_FOUND'){
                        data = {};
                    }
                }
                //渲染模版
                var engine = new Engine({
                    root: paths.templateOutput,
                    template: paths.templateOutput + "/" +newPath,
                    output: paths.outputRoot + "/" + newPath
                });
                var result = engine.render(data);
            }
        }));
});





gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.images, ['images']);
});



gulp.task('default',['clean'],function(){
    gulp.start(['less','image','template','jsLib','js']);
});

gulp.task('pro',['clean'],function(){
    gulp.start(['less','image','template','requirejs-build','jsConcat']);

});


/**
 *1.img压缩 ok
 *2.css压缩 ok
 *3.css sprite
 *4.inline 把css，js inline进去html里面
 *5.md5 对路径加md5
 *6.requirejs ok
 *7.requirejs min ok
 *8.requirejs 公用抽离 ok
 *9.global 合并 ok
 *
 */