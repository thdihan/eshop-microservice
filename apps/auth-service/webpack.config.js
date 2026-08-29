const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = {
    output: {
        path: join(__dirname, 'dist'),
        clean: true,
        ...(process.env.NODE_ENV !== 'production' && {
            devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        }),
    },
    resolve: {
        // alias: {
        //     '@packages': resolve(__dirname + '../../packages'),
        // },
        // extensions: ['.ts', '.js'],

        modules: [
            resolve(__dirname, 'node_modules'),
            resolve(__dirname, '../../node_modules'),
            'node_modules',
        ],
        plugins: [
            new TsconfigPathsPlugin({
                configFile: resolve(__dirname, '../../tsconfig.base.json'),
            }),
        ],
    },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: './src/main.ts',
            tsConfig: './tsconfig.app.json',
            // assets: ['./src/assets'],
            optimization: false,
            outputHashing: 'none',
            generatePackageJson: true,
            sourceMap: true,
        }),
    ],
};
