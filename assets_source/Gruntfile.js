 // ██████╗ ██████╗ ██╗   ██╗███╗   ██╗████████╗███████╗██╗██╗     ███████╗        ██╗███████╗
// ██╔════╝ ██╔══██╗██║   ██║████╗  ██║╚══██╔══╝██╔════╝██║██║     ██╔════╝        ██║██╔════╝
// ██║  ███╗██████╔╝██║   ██║██╔██╗ ██║   ██║   █████╗  ██║██║     █████╗          ██║███████╗
// ██║   ██║██╔══██╗██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██║██║     ██╔══╝     ██   ██║╚════██║
// ╚██████╔╝██║  ██║╚██████╔╝██║ ╚████║   ██║   ██║     ██║███████╗███████╗██╗╚█████╔╝███████║
 // ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝ ╚════╝ ╚══════╝

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        sass: {
            dist: {
                files: {
                    '../assets/css/game.css': 'scss/game.scss',
                    '../assets/css/mobile.css': 'scss/mobile.scss'
                }
            },
            options: {
                sourcemap: 'true'
            }
        },
        watch: {
            options: {
                livereload: true,
            },
            css: {
                files: 'scss/*.scss',
                tasks: ['newer:sass'],
            },
            js: {
                files: ['js/*.js', 'js/*/*.js'],
                tasks: ['process'],
            },
            html: {
                files: '../game/*.html',
            },
        },
        concat_sourcemap: {
            options: {
                sourcesContent: true
            },
            target: {
                files: {
                    '../assets_source/js/DT.js': [
                        'js/vendor/fireworks-bundle.js',
                        'js/vendor/Detector.js',
                        'js/vendor/threex.windowresize.js',
                        'js/vendor/Stats.js',
                        'js/vendor/webaudio.js',
                        'js/vendor/THREEx.FullScreen.js',
                        'js/vendor/AnaglyphEffect.js',
                        'js/init.js',
                        'js/main.js',
                    ]
                }
            }
        },
        uglify: {
            dist: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    banner: '/* Created by deemidroll | deemidroll@gmail.com | 2014 */',
                },
                files: {
                    '../assets/js/DT.min.js': ['js/DT.js'],
                    '../assets/js/myYepnope.min.js': ['js/myYepnope.js'],
                    '../assets/js/mobile.min.js': ['js/mobile.js'],
                }
            }
        },
    });
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-concat-sourcemap');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-newer');
    grunt.registerTask('process', ['concat_sourcemap', 'uglify']);
    grunt.registerTask('default', ['newer:sass', 'concat_sourcemap', 'uglify', 'watch']);
}