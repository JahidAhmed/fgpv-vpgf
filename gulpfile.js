/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
/* jshint camelcase:false */
/* global -$ */
'use strict';

const gulp = require('gulp');
const glob = require('glob');
const del = require('del');
const pkg = require('./package.json');
const $ = require('gulp-load-plugins')({ lazy: true });
const yargs = require('yargs');
const args = yargs.argv;
const runSequence = require('run-sequence');
const bowerFiles = require('main-bower-files');
const config = require('./gulp.config')();
const Server = require('karma').Server;
const dateFormat = require('dateformat');
const through = require('through2');
const merge = require('merge-stream');
const lazypipe = require('lazypipe');
const fs = require('fs');

// const jsDefaults = require('json-schema-defaults');
// const jsRefParser = require('json-schema-ref-parser');

require('gulp-help')(gulp);

let PROD_MODE = args.prod;

/**
 * yargs variables can be passed in to alter the behavior, when present.
 * Example: gulp serve:dev
 *
 * --verbose  : Various tasks will produce more output to the console.
 * --nosync   : Don't launch the browser with browser-sync when serving code.
 * --debug    : Launch debugger with node-inspector.
 * --debug-brk: Launch debugger and break on 1st line with node-inspector.
 * --test     : run Karma auto tests in parallel
 */

/**
 * vet the code and create coverage report
 *  -- verbose: verbose
 *  -- guts: skip style checks
 * @return {Stream}
 */
gulp.task('vet', 'Checks code against style guidelines', function () {
    log('Analyzing source with JSHint and JSCS');

    return gulp
        .src(config.vetjs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.if(!args.guts,
            lazypipe()
            .pipe($.jshint)
            .pipe($.jscs)
            .pipe($.jscsStylish.combineWithHintResults)
            .pipe($.jshint.reporter, 'jshint-stylish', { verbose: true })
            .pipe($.jshint.reporter, 'fail')()
        ));
});

gulp.task('validate', 'Validate all config files against the config schema', function () {
    // disabling config validation
    // TODO: upconvert schema 1->2 to validate
    return gulp.src(config.src + 'config*._json')
        .pipe($.tv4(config.src + 'schema.json'))
        .pipe(through.obj(function (file, enc, callback) {
            callback(null, file);
            if (!file.tv4.valid) {
                $.util.log($.util.colors.red(file.tv4.error.message));
                $.util.log($.util.colors.red('JSON validation error(s) found in ' + file.path));
                process.exit(1);
            }
        }))
        .pipe($.if(args.verbose, $.print()));
});

/**
 * Create a visualizer report
 */
gulp.task('plato', 'Generate visualizer report', function (done) {
    log('Analyzing source with Plato');
    log('Browse to /report/plato/index.html to see Plato results');

    startPlatoVisualizer(done);
});

/**
 * Remove all files from the build, temp, and reports folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean', 'Delete all build and report files', ['clean-sass'],
    function (done) {
        var delconfig = [].concat(config.libBuild, config.sampleBuild, config.report);
        log('Cleaning: ' + $.util.colors.blue(delconfig));
        del(delconfig, done);
    });

/**
 * Remove all styles from the temp folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-sass', false, function (done) {
    del(config.css, done);
});

gulp.task('sass', 'Generate CSS from SASS', ['clean-sass'],
    function () {
        log('Compiling SASS --> CSS');

        return gulp
            .src(config.scss)
            .pipe($.sass().on('error', $.sass.logError))
            .pipe($.autoprefixer('last 2 version', '> 5%'))

            .pipe($.if(PROD_MODE, $.cssnano()))

            .pipe(gulp.dest(config.libBuild))

            .pipe($.connect.reload());
    });

/**
 * Inject config schema default snippets into the code.
 * @param  {String} contents stringified contents of the core/constant.service
 */
function injectConfigDefaults(contents) {
    return contents.replace('\'_LAYER_CONFIG_DEFAULTS_\'', JSON.stringify(pkg.schemaDefaults, null, '    '));
}

function injectVersion(contents) {
    // inject version into the version constant service
    Object.keys(pkg._v).forEach(key => {
        contents = contents.replace('_' + key.toUpperCase() + '_', pkg._v[key]);
    });

    return contents;
}

function injectRandomFile(replaceToken, fileName) {
    var f = fs.readFileSync(fileName, 'utf8').toString().replace(/\r|\n/gm, '').replace(/'/g, '\\\'');
    return function (contents) {
        return contents.replace(replaceToken, f);
    };
}

function injectTranslations(contents) {
    const translations = fs.readdirSync(`${config.sampleBuild}/locales`)
                           .filter(f => fs.statSync(`${config.sampleBuild}/locales/${f}`).isDirectory())
                           .map(name => ({
                               name,
                               data: fs.readFileSync(`${config.sampleBuild}/locales/${name}/translation.json`)
                           }))
                           .map(({ name, data }) => `'${name}': ${data}`)
                           .join(',\n');

    // remove translation files since they've been inlined
    del(`${config.sampleBuild}/locales`);
    return contents.replace('AUTOFILLED_TRANSLATIONS = {}', `AUTOFILLED_TRANSLATIONS = {\n${translations}\n}`);
}

// inject error css file into the index page if babel parser errors
function injectError(error) {
    var injector = '';
    if (error) {
        injector = '<link rel="stylesheet" href=".' + config.csserror + '">';
        $.util.log(error);
    }

    return gulp
        .src(config.build + '/index*.html')
        .pipe($.replace(/<!-- inject:error -->([\s\S]*?)<!-- endinject -->/gi, '<!-- inject:error -->' + injector + '<!-- endinject -->'))
        .pipe(gulp.dest(config.sampleBuild));
}

/**
 * Concat and optionally uglify js libs.
 * @return {Stream}
 */
function libbuild() {
    return gulp.src(bowerFiles())
        .pipe($.concat(config.jsLibFile));
}

/**
 * Concat and build core plugins.
 * @return {Stream}
 */
function pluginbuild() {
    return gulp.src(config.jsCorePlugins)
        .pipe($.babel({ presets: ['latest'] }))
        .pipe($.concat(config.jsCorePluginFile));
}

/**
 * Create $templateCache from the html templates
 * @return {Stream}
 */
function templatecache() {
    const htmlTemplates = gulp
        .src(config.htmltemplates)
        .pipe($.if(args.verbose, $.bytediff.start()))
        .pipe($.minifyHtml({ empty: true }))
        .pipe($.if(args.verbose, $.bytediff.stop(bytediffFormatter)));
    const svgTemplates = gulp.src(config.svgSources);
    return merge(htmlTemplates, svgTemplates)
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ));
}

/**
 * Prepare main app js file.
 * @return {Stream}
 */
function jsbuild() {
    injectError(false);

    const versionFilter = $.filter('**/version.*.js', { restore: true });
    const configDefaultsFilter  = $.filter('**/geo/geo.constant.service.js', { restore: true });
    const constantServiceFilter  = $.filter('**/core/constant.service.js', { restore: true });

    return gulp
        .src(config.js)

        // inject version info
        .pipe(versionFilter)
        .pipe($.insert.transform(injectVersion))
        .pipe(versionFilter.restore)

        // inject config defaults generated from the config schema and XSLT static content
        .pipe(configDefaultsFilter)
        .pipe($.insert.transform(injectConfigDefaults))
        .pipe($.insert.transform(injectRandomFile('_XSLT_BLOB_', config.xslt)))
        .pipe(configDefaultsFilter.restore)

        // inject translations into core constants file
        .pipe(constantServiceFilter)
        .pipe($.insert.transform(injectTranslations))
        .pipe(constantServiceFilter.restore)

        .pipe($.plumber({ errorHandler: injectError }))
        .pipe($.babel({ presets: ['latest'] }))
        .pipe($.plumber.stop())
        .pipe($.ngAnnotate({
            remove: true,
            add: true,
            single_quotes: true
        }))
        .pipe($.angularFilesort())
        .pipe($.concat(config.jsSingleFile))
        .pipe($.if(PROD_MODE, $.removeLogging()));
}

// NOTE assetcopy should only be used for samples for development
// all assets needed by the library should be inlined if possible
gulp.task('assetcopy', 'Copy assets to the samples directory', () =>
    gulp.src(config.staticAssets, { base: config.src })
        .pipe(gulp.dest(config.sampleBuild))
);

gulp.task('makesvgcache', 'Rebuild the SVG cache', (cb) => {
    require('./scripts/svgCache.js').buildCache(cb);
});

gulp.task('translate', 'Split translation csv into internationalized files',
    function () {
        return gulp.src(config.src + 'locales/translations.csv')
            .pipe($.i18nCsv())
            .pipe(gulp.dest(config.sampleBuild));
    });

gulp.task('jsrollup', 'Roll up all js into one file',
    ['jsinjector', 'validate', 'version', 'configdefaults', 'translate'],
    function () {

        const jslib = libbuild();
        const plugins = pluginbuild();
        const jscache = templatecache();
        const jsapp = jsbuild();
        const seed = gulp.src([config.jsGlobalRegistry, config.jsAppSeed])
            .pipe($.plumber({ errorHandler: injectError }))
            .pipe($.babel({ presets: ['latest'] }))
            .pipe($.plumber.stop())
            .pipe($.if(PROD_MODE, $.removeLogging()));

        // global registry goes after the lib package
        // app-seed `must` be the last item

        // merge all js streams to avoid writing individual files to disk
        return merge(jslib, plugins, jscache, jsapp, seed) // merge doesn't guarantee file order :(
            .pipe($.order(config.jsOrder))
            .pipe($.concat(config.jsCoreFile))
            // can't use lazy pipe with uglify
            .pipe($.if(PROD_MODE, $.sourcemaps.init()))
            .pipe($.if(PROD_MODE, $.uglify()))
            .pipe($.if(PROD_MODE, $.sourcemaps.write('./maps')))
            .pipe(gulp.dest(config.libBuild));
    });

gulp.task('jsinjector', 'Copy fixed assets to the build directory',
    function () {

        // we don't run babel on the polyfills as it tries to restrict their access to global/window scope
        const polyfills = gulp.src(config.jsPolyfills)
            .pipe($.plumber({ errorHandler: injectError }))
            .pipe($.plumber.stop())
            .pipe($.concat(config.jsPolyfillsFile));

        const iePolyfills = gulp.src(config.jsIePolyfills)
            .pipe($.plumber({ errorHandler: injectError }))
            .pipe($.plumber.stop())
            .pipe($.concat(config.jsIePolyfillsFile));

        // NOTE it is currently reasonable to load ES7 polyfills with injector as
        // the only one we have is Object.entries and it is very small
        // if it gets bigger we should split it into a separate file
        const injector = merge(
            gulp.src(config.jsInjectorFile)
                .pipe($.babel({ presets: ['latest'] }))
                .pipe($.if(PROD_MODE, $.removeLogging())),
            polyfills
        )
            .pipe($.order(config.injectorOrder))
            .pipe($.concat(config.jsInjectorDest));

        const streams = [iePolyfills, injector].map(stream => {
            return stream
                .pipe($.if(PROD_MODE, $.sourcemaps.init()))
                .pipe($.if(PROD_MODE, $.uglify()))
                .pipe($.if(PROD_MODE, $.sourcemaps.write('./maps')))
                .pipe(gulp.dest(config.libBuild));
        });

        return merge(...streams);
    });

gulp.task('inject', 'Adds configured dependencies to the HTML page',
    ['sass', 'jsrollup', 'assetcopy'],
    function () {
        var index = config.index;
        var js = config.js;

        log('Injecting JS');

        if (args.protractor) {
            index = config.indexProtractor;
            js.push('!' + config.app + 'app-seed.js'); // remove app-seed from injectables
        }

        const injectOpts = { ignorePath: '../build', addPrefix: '..', relative: true };
        // NOTE injecting script tags for IE is too annoying at the moment,
        // if there is a better option we can add this back but for now '../lib/ie-polyfills.js' is hardcoded
        // const iePolyOpts = { ignorePath: '../build', addPrefix: '..', relative: true, name: 'ie', removeTags: true };

        return gulp
            .src(index)
            .pipe($.inject(gulp.src(config.jsInjectorFilePath), injectOpts))
            .pipe(gulp.dest(config.sampleBuild));
    }, {
        aliases: ['build']
    });

gulp.task('remove-apikey', 'Remove internal Google API key from config', ['inject'], () => {
    gulp.src([config.sampleBuild + 'config*.json'])
        .pipe($.deleteLines({ filters: [/\s*"googleAPIKey": \S+/] }))
        .pipe(gulp.dest(config.sampleBuild));
});

gulp.task('samples', 'Generate sample archives for distribution', ['remove-apikey'], () =>
    merge(
        gulp
            .src([config.build + '/**'])
            .pipe($.tar('fgpv-' + pkg.version + '-dev-samples.tgz'))
            .pipe($.gzip({ append: false }))
            .pipe(gulp.dest('dist')),
        gulp
            .src([config.build + '/**'])
            .pipe($.zip('fgpv-' + pkg.version + '-dev-samples.zip'))
            .pipe(gulp.dest('dist')))
);

gulp.task('packages', 'Generate package archives for distribution', ['inject'], () =>
    merge(
        gulp
            .src([config.libBuild + '/**'])
            .pipe($.tar('fgpv-' + pkg.version + '.tgz'))
            .pipe($.gzip({ append: false }))
            .pipe(gulp.dest('dist')),
        gulp
            .src([config.libBuild + '/**'])
            .pipe($.zip('fgpv-' + pkg.version + '.zip'))
            .pipe(gulp.dest('dist')))
);

gulp.task('prod', 'Sets production mode', () => PROD_MODE = true);

gulp.task('dist', 'Generate tgz and zip files for distribution', done => {
    // delete any previous distribution files
    del(config.dist);
    // generate samples without minifications
    // then generate a minified production package for distribution
    runSequence('clean', 'samples', 'clean', 'prod', 'packages', done);
});

/**
 * Serves the app.
 * -- test  : run Karma auto tests in parallel
 * -- protractor  : prepare index-protractor page and do not inject app-seed
 * -- prod  : minify everything
 */
gulp.task('serve:dev', 'Build the application and start a local development server',
    ['vet', 'inject'],
    function () {
        // run karma tests parallel with serve
        if (args.test) {
            startTests(false);
        }
        serve(true);
        $.util.log(`
                       $ MM...NMMM,
                       M... MM.....$MM7
                 MMM...M..........:....M+
              NM.......M................M
             M .........M+.............NMIMM7
             M...........+MM..........MI......MM
           MMM...............:MMMMMM............=
         M... M.................................M
        M.......MD.............................N..,N
        M..........Z8.......................IM8.....M
        M......................... ,:8MMMMD..........M
      MMM~..........................................+M
     M....M .......................................MM
     M......8N .................................NMN.8M
    :M......... =MMMMMO,.................:MMM~.......M~
     M$..............................................M
       MN.........................................MMM
         DMM.................................NMMMD
          M.M. MMM......................MMM.:..$M
          +M...D..+.MMMMI........MMMD..M....M.:.M
           M.N....M..~..7..M..M..N..+..+.:....D,
            M.7.Z....M..M..M..M..O.......M.$.,.M
            OO...,.M....N..M..M..Z.......+.$.Z$I
             M.,.I....O..,.Z..M..7............M
              M:....M.~..M..Z.M..+....M.I.=..M
              $~.........7..8.8.......M.:....M
               ?M...........Z.:.............M=
                  ~MN...................IM?
                        ..+MMMMMMM8
        `);
    }, {
        aliases: ['serve']
    });

/**
 * Run specs once and exit
 * -- coverage  : generate test coverage info
 * @return {Stream}
 */
gulp.task('test', 'Run style checks and unit tests',
    ['vet', 'validate'],
    function (done) {
        startTests(true, done);
    });

/**
 * Run specs and wait.
 * -- coverage  : generate test coverage info
 * Watch for file changes and re-run tests on each change
 */
gulp.task('test:auto', 'Run unit tests and keep watching for changes',
    ['vet', 'validate'],
    function (done) {
        startTests(false, done);
    });

/**
 * Generates the changelog from commit messages.
 * releseCount 0 regenerates all releases.
 */
gulp.task('changelog', 'Generate a changelog based on commit history', function () {
    return gulp.src('CHANGELOG.md')
        .pipe($.conventionalChangelog({
            preset: 'angular',
            releaseCount: 0
        }))
        .pipe(gulp.dest('./'));
});

function serve(isDev) {
    $.connect.server({
        root: config.root,
        livereload: true,
        port: config.defaultPort

        // fallback option doesn't seem to work well with index page reload
        // fallback: isDev ? config.src + 'index.html' : config.build + 'index.html'
    });

    if (isDev) {
        gulp
            .watch(config.watchsass, ['sass'])
            .on('change', logWatch)
        ;

        gulp
            .watch(config.watchjs, ['reloadapp'])
            .on('change', logWatch)
        ;

        gulp
            .watch(config.watchhtml, ['reloadapp'])
            .on('change', logWatch)
        ;

        gulp
            .watch(config.watchconfig, ['reloadconfig'])
            .on('change', logWatch)
        ;
    }
}

/**
 * Reloads core.js file on source files changes. Do not call directly.
 * @return {Stream}
 */
gulp.task('reloadapp', 'Repackaging app...', ['jsrollup'], function () {
    return gulp
        .src(config.jsInjectorFilePath)
        .pipe($.connect.reload());
});

/**
 * Copy changed config and validate against schema on config files changes. Reload core.js. Do not call directly.
 * @return {Stream}
 */
gulp.task('reloadconfig', 'Repackaging app...', ['validate', 'assetcopy'], function () {
    return gulp
        .src(config.jsInjectorFilePath)
        .pipe($.connect.reload());
});

/**
 * Start the tests using karma.
 * @param  {boolean} singleRun - True means run once and end (CI), or keep running (dev)
 * @param  {Function} done - Callback to fire when karma is done
 */
function startTests(singleRun, done) {
    var excludeFiles = [];
    var karma = require('karma').server;

    var karmaConfig = {
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun
    };

    // add coverage reporter
    if (args.coverage) {
        karmaConfig.reporters = ['progress', 'coverage'];
    }

    // generate template module for tests
    templatecache()
        .pipe(gulp.dest(config.tmp))
        .on('end', () => {
            // wait for templates before starting tests
            karma = new Server(karmaConfig);
            karma.on('run_complete', (browsers, results) => {
                if (karmaConfig.singleRun) {
                    log('Karma completed');
                    done(results.error ? 'There are test failures' + results : null);
                } else {
                    log('Karma run completed');
                }
            });
            karma.start();
        });
}

/**
 * Start Plato inspector and visualizer
 */
function startPlatoVisualizer(done) {
    var files = glob.sync(config.plato.js);
    var plato = require('plato');
    var excludeFiles = /.*\.spec\.js/;

    var options = {
        title: 'Plato Inspections Report',
        exclude: excludeFiles
    };
    var outputDir = config.report + '/plato';

    log('Running Plato');

    plato.inspect(files, outputDir, options, platoCompleted);

    function platoCompleted(report) {
        var overview = plato.getOverviewReport(report);
        if (args.verbose) {
            log(overview.summary);
        }
        if (done) { done(); }
    }
}

/**
 * Log an event to the console.
 * @param  {Object} event
 */
function logWatch(event) {
    log('*** File ' + event.path + ' was ' + event.type + ', running tasks...');
}

/* function removeMatch(originalArray, regex) {
    var j = 0;
    while (j < originalArray.length) {
        if (regex.test(originalArray[j])) {
            originalArray.splice(j, 1);
        } else {
            j++;
        }
    }
    return originalArray;
} */

/**
 * Delete all files in a given path
 * @param  {Array}   path - array of paths to delete
 * @param  {Function} done - callback when complete
 */
/* function clean(path, done) {
    log('Cleaning: ' + $.util.colors.blue(path));
    del(path, done);
} */

/**
 * Formatter for bytediff to display the size changes after processing
 * @param  {Object} data - byte data
 * @return {String}      Difference in bytes, formatted
 */
function bytediffFormatter(data) {
    var difference = (data.savings > 0) ? ' smaller.' : ' larger.';
    return data.fileName + ' went from ' +
        (data.startSize / 1000).toFixed(2) + ' kB to ' +
        (data.endSize / 1000).toFixed(2) + ' kB and is ' +
        formatPercent(1 - data.percent, 2) + '%' + difference;
}

/**
 * Format a number as a percentage
 * @param  {Number} num       Number to format as a percent
 * @param  {Number} precision Precision of the decimal
 * @return {String}           Formatted perentage
 */
function formatPercent(num, precision) {
    return (num * 100).toFixed(precision);
}

/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg) {
    var item;

    if (typeof (msg) === 'object') {
        for (item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

/**
 * Generates defaults from selected config schema definitions.
 */
gulp.task('configdefaults', done => {
    // do not generate config defaults
    // TODO: check if this is needed at all for schema 2
    done();

    return true;
    /*
    jsRefParser.dereference(config.schema).then(schema => {
        const defs = [
            'basicLayerOptionsNode',
            'featureLayerOptionsNode',
            'compoundLayerOptionsNode',
            'dynamicLayerOptionsNode',

            'wmsLayerEntryNode',
            'dynamicLayerEntryNode'
        ];

        pkg.schemaDefaults = {};
        defs.forEach(def => {
            pkg.schemaDefaults[def] = jsDefaults(schema.definitions[def]);
        });

        done();
    });*/
});

/**
 * Stores version info on the pkg object.
 */
gulp.task('version', function (done) {
    const version = getVersion();

    $.git.revParse({ args: '--short HEAD' }, function (err, hash) {
        if (err) {
            console.error('Cannot get current git hash');
        }

        version.hash = hash;
        pkg._v = version;

        done();
    });
});

/**
 * Generates current version number object and returns it as an Object.
 * @return {Object} version info
 */
function getVersion() {
    const now = new Date();
    const version = pkg.version.split('.');

    return {
        major: version[0],
        minor: version[1],
        patch: version[2],
        timestamp: dateFormat(now, 'yyyy-mm-dd HH:MM:ss')
    };
}
