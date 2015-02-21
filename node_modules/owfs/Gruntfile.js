/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: false,
        unused: true,
        boss: true,
        eqnull: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      test: {
        src: ['test/**/*.js']
      }
    },
    cafemocha: {
      js: 'test/*',
      options: {
        ui: 'tdd',
        reporter: 'nyan',
        compilers: 'coffee:coffee-script/register'
      }
    },
    coffee: {
      build: {
        expand: true,
        cwd: 'src',
        src: ['**/*.coffee'],
        dest: 'build',
        ext: '.js',
        options: {
          sourceMap: true
        },
      }
    },
    coffeelint: {
      src: ['src/**/*.coffee'],
      options: {
        "no_tabs": {
          "level": "ignore"
        },
        "indentation": {
          "value": 1,
          "level": "error"
        },
      }
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-cafe-mocha');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-coffeelint');

  // Default task.
  grunt.registerTask('default', ['jshint','coffeelint', 'coffee', 'test']);

  grunt.registerTask('test', ['cafemocha']);

};