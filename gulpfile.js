/**
 * Created by ppf on 9/7/15.
 */





var gulp = require('gulp');
var del = require('del');
var less = require('gulp-less');
var path = require('path');
var rename = require('gulp-rename');
var minifyCSS = require('gulp-minify-css');
var streamqueue = require('streamqueue');
var imagemin = require('gulp-imagemin');
var Transform = require('readable-stream/transform');


var srcRoot = "./src",
    outputRoot = './output',
    templateRoot = './template',
    type = 'dev';

var paths = {
    srcRoot : srcRoot,
    outputRoot : outputRoot,
    imgSrc : [srcRoot+"/img/**",srcRoot+"/+(modules)/*/img/**"],
    imgOutput : outputRoot + '/img',
    cssSrc : [srcRoot+"/css/*.less",srcRoot+"/+(modules)/*/css/*.less"],
    cssOutput : outputRoot + '/css',
    templateSrc : [srcRoot+"/html/**",srcRoot+"/+(modules)/*/html/**"],
    templateOutput : templateRoot

}


gulp.task('clean', function() {
    // You can use multiple globbing patterns as you would with `gulp.src`
    return del([paths.outputRoot,paths.templateOutput]);
});


function noop(cb){
    cb();
}

/**
 * less
 */

gulp.task('less', function () {

    var s = gulp.src(paths.cssSrc)
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes'),paths.srcRoot + '/css' ]
        }));
    s = type === 'pro' ?  s.pipe(minifyCSS()) : s ;
    s.pipe(rename(function(filepath) {
        var res;
        if(res = /^modules\/([^\/]+)\/css/.exec(filepath.dirname)){
            filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
        }else if(filepath.dirname.indexOf("modules") === 0){
            filepath.dirname = "";
            filepath.basename = "";
        }
        filepath.extname = type === "pro" ? ".min" + filepath.extname : filepath.extname;
    }))
    .pipe(gulp.dest(paths.cssOutput))
});

/**
 * image
 */

gulp.task('image', function () {
    gulp.src(paths.imgSrc)
        .pipe(rename(function(filepath) {
            var res;
            if(res = /^modules\/([^\/]+)\/img/.exec(filepath.dirname)){
                filepath.dirname = res[1] + "/" + filepath.dirname.replace(res[0],'');
            }else if(filepath.dirname.indexOf("modules") === 0){
                filepath.dirname = "";
                filepath.basename = "";
            }
        }))
        .pipe(imagemin({
            optimizationLevel : 5
        }))
        .pipe(gulp.dest(paths.imgOutput))
});

/**
 * template
 * 引入volecity模版
 *
 *
 */

gulp.task('template', function (cb) {
    //移动template到路径上面

    var map = {};

    var stream = gulp.src(paths.templateSrc)
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
        .pipe(gulp.dest(paths.templateOutput));

    stream.on('end',function(){
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



        cb();
    });

});



gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.images, ['images']);
});



gulp.task('default',['clean'],function(){
    gulp.start(['less','image','template']);
});

gulp.task('pro',function(){
    type = 'pro';
    gulp.start(['default']);

});


/**
 *1.img压缩 ok
 *2.css压缩 ok
 *3.css sprite
 *4.inline 把css，js inline进去html里面
 *5.md5 对路径加md5
 *6.requirejs
 *
 */