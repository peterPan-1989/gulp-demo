/**
 * Created by ppf on 9/8/15.
 */
requirejs.config({
    baseUrl: 'js',
    paths: {
        'jquery': 'lib/jquery/jquery'

    },
    shim : {
        "jquery" : {
            exports: '$'
        }
    }
});