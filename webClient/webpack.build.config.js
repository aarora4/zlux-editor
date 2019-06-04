
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var path = require('path');
var webpackConfig = require('webpack-config');
var CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
// const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

var config = {
  'entry': {
    'main': path.resolve(__dirname, './src/plugin.ts'),
  },
  'output': {
    'path': path.resolve(__dirname, '../web'),
    'filename': '[name].js',
  },
  'module': {
    'rules': [{
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      {
        test: /\.scss$/,
        'use': [
          'exports-loader?module.exports.toString()',
          {
            'loader': 'css-loader',
            'options': {
              'sourceMap': false
            }
          },
          'sass-loader'
        ]
      }
    ],
  },
  "node": {
    "net": "empty",
    "fs": 'empty',
    "child_process": 'empty'
  },
  "resolve": {
    "alias": {
        'vscode': require.resolve('monaco-languageclient/lib/vscode-compatibility')
    }
  },

  'plugins': [
    new CopyWebpackPlugin([{
        from: path.resolve(__dirname, './src/assets'),
        to: path.resolve('../web/assets')
      },
      {
        from: path.resolve(__dirname, './src/mock'),
        to: path.resolve('../web/mock')
      },
      {
        "context": "node_modules/ngx-monaco-editor/assets/monaco",
        "to": "assets/monaco",
        "from": {
          "glob": "**/*",
          "dot": true
        }
      },
    ]),
    new CompressionPlugin({
      threshold: 100000,
      minRatio: 0.8
    })
    // new MonacoWebpackPlugin()
  ]
};


module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.base.js'))
  .merge(config);

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
