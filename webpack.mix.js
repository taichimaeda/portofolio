const mix = require('laravel-mix');

mix.browserSync({
    files: ['./**/*'],
    server: './dist',
    proxy: null,
});

mix.ts('./src/index.ts', './dist/index.js').sourceMaps();
mix.sass('./src/index.scss', './dist/index.css');
mix.copy('./src/*.html', './dist');
mix.copy('./src/*.json', './dist');
