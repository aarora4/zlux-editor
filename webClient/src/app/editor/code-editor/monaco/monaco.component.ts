
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import * as ws from "ws";
import * as http from "http";
import * as Url from "url";
import * as net from "net";
import * as express from "express";
import * as rpc from "vscode-ws-jsonrpc";
import { launch } from "./json-server-launcher";
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { listen, MessageConnection } from 'vscode-ws-jsonrpc/lib';
import {
  MonacoLanguageClient, CloseAction, ErrorAction,
  createConnection,
} from 'monaco-languageclient';
import {
  MonacoServices
} from 'monaco-languageclient';
import { MonacoService } from './monaco.service';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { LanguageServerService } from '../../../shared/language-server/language-server.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import normalizeUrl = require('normalize-url');
const ReconnectingWebSocket = require('reconnecting-websocket');

@Component({
  selector: 'app-monaco',
  templateUrl: './monaco.component.html',
  styleUrls: ['./monaco.component.scss']
})
export class MonacoComponent implements OnInit, OnChanges {
  @Input() options;
  @Input() editorFile;

  constructor(
    private monacoService: MonacoService,
    private editorControl: EditorControlService,
    private languageService: LanguageServerService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {
  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    for (const input in changes) {
      if (input === 'editorFile' && changes[input].currentValue != null) {
        this.monacoService.openFile(
          changes[input].currentValue['context'],
          changes[input].currentValue['reload'],
          changes[input].currentValue['line']);
      }
    }
  }

  onMonacoInit(editor) {
    this.editorControl.editor.next(editor);
    this.keyBinds(editor);
    this.viewportEvents.resized.subscribe(()=> {
      editor.layout()
    });

    // create the express application
  const app = express();
  // server the static content, i.e. index.html
  app.use(express.static(__dirname));
  // start the server
  const server = app.listen(8544);
  // create the web socket
  const wss = new ws.Server({
      noServer: true,
      perMessageDeflate: false
  });
  server.on('upgrade', (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      const pathname = request.url ? Url.parse(request.url).pathname : undefined;
      if (pathname === '/sampleServer') {
          wss.handleUpgrade(request, socket, head, webSocket => {
              const socket: rpc.IWebSocket = {
                  send: content => webSocket.send(content, error => {
                      if (error) {
                          throw error;
                      }
                  }),
                  onMessage: cb => webSocket.on('message', cb),
                  onError: cb => webSocket.on('error', cb),
                  onClose: cb => webSocket.on('close', cb),
                  dispose: () => webSocket.close()
              };
              // launch the server when the web socket is opened
              if (webSocket.readyState === webSocket.OPEN) {
                  launch(socket);
              } else {
                  webSocket.on('open', () => launch(socket));
              }
          });
      }
  })
      /* disable for now... */

    // this.log("onMonacoInit has been called");

    // this.editorControl.connToLS.subscribe((lang) => {
    //   this.connectToLanguageServer(lang);
    // });
    // this.editorControl.disFromLS.subscribe((lang) => {
    //   this.closeLanguageServer(lang);
    // });

    // this.connectToLanguageServer('python');


    process.on('uncaughtException', function (err: any) {
      console.error('Uncaught Exception: ', err.toString());
      if (err.stack) {
          console.error(err.stack);
      }
  });
  // install Monaco language client services
MonacoServices.install(editor);

// create the web socket
const url = this.createUrl('/sampleServer')
const webSocket = this.createWebSocket(url);
// listen when the web socket is opened
listen({
  webSocket,
  onConnection: connection => {
    // create and start the language client
    const languageClient = this.createLanguageClient(connection);
    const disposable = languageClient.start();
    connection.onClose(() => disposable.dispose());
  }
});


  
    
  }

  keyBinds(editor: any) {
    let self = this;
    //editor.addAction({
      // An unique identifier of the contributed action.
      //id: 'save-all',

      // A label of the action that will be presented to the user.
      //label: 'Save All',

      // An optional array of keybindings for the action.
      //keybindings: [
        // tslint:disable-next-line:no-bitwise
        //monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
        // chord
        // tslint:disable-next-line:no-bitwise
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      //],

      // A precondition for this action.
      //precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      //keybindingContext: null,

      //contextMenuGroupId: 'file',

      //contextMenuOrder: 1.1,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convenience
      //run: function (ed) {
        //self.editorControl.saveAllFile.emit();
        //return null;
      //}
    //});
    editor.addAction({
      // An unique identifier of the contributed action.
      id: 'save',

      // A label of the action that will be presented to the user.
      label: 'Save',

      // An optional array of keybindings for the action.
      keybindings: [
        // tslint:disable-next-line:no-bitwise
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
        // chord
        // tslint:disable-next-line:no-bitwise
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      ],

      // A precondition for this action.
      precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: null,

      contextMenuGroupId: 'file',

      contextMenuOrder: 1.2,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convenience
      run: function (ed) {
        let fileContext = self.editorControl.fetchActiveFile();
        let sub = self.monacoService.saveFile(fileContext).subscribe(() => sub.unsubscribe());
        return null;
      }
    });
  }

  connectToLanguageServer(lang?: string) {
   
    let languages = this.languageService.getSettings().endpoint;
    let connExist = this.languageService.connections.map(x => x.name);

    for (let language in languages) {
      if (lang) {
        if (lang === language && connExist.indexOf(language) < 0) {
          //this.listenTo(language);
        } else {
          this.log.warn(`${language} server already started!`);
        }
      } else {
        if (connExist.indexOf(language) < 0) {
          //this.listenTo(language);
        } else {
          this.log.warn(`${language} server already started!`);
        }
      }
    }
  }

  closeLanguageServer(lang?: string) {
    this.languageService.connections
      .filter(c => {
        if (lang) {
          return c.name === lang;
        } else {
          return true;
        }
      })
      .forEach(c => {
        let conn = this.languageService.connections;
        c.connection.dispose();
        conn.splice(conn.indexOf(c), 1);
      });
  }

  // listenTo(lang: string) {
  //   const langUrl = this.createUrl(lang);
  //   const langWebSocket = this.createWebSocket(langUrl);
  //   const langService = createMonacoServices(this.editorControl.editor.getValue());

  //   this.log.info(`Connecting to ${lang} server`);

  //   listen({
  //     webSocket: langWebSocket,
  //     onConnection: connection => {
  //       // create and start the language client
  //       const languageClient = this.createLanguageClient(lang, connection, langService);
  //       const disposable = languageClient.start();
  //       connection.onClose(() => disposable.dispose());
  //       connection.onDispose(() => disposable.dispose());
  //       this.languageService.addConnection(lang, connection);
  //     }
  //   });
  // } 

  createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
    return new MonacoLanguageClient({
      name: "Sample Language Client",
      clientOptions: {
        // use a language id as a document selector
        documentSelector: ['python'],
        // disable the default error handler
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart
        }
      },
      // create a language client connection from the JSON RPC connection on demand
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          console.log('here')
          return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
        }
      }
    });
  }


  // createUrl(language: string): string {
  //   return this.languageService.getLanguageUrl(language);
  // }

  // createLanguageClient(language: string, connection: MessageConnection, services: BaseLanguageClient.IServices): BaseLanguageClient {
  //   return new BaseLanguageClient({
  //     name: `${language} language client`,
  //     clientOptions: {
  //       // use a language id as a document selector
  //       documentSelector: [language],
  //       // disable the default error handler
  //       errorHandler: {
  //         error: () => ErrorAction.Continue,
  //         closed: () => CloseAction.DoNotRestart
  //       }
  //     },
  //     services,
  //     // create a language client connection from the JSON RPC connection on demand
  //     connectionProvider: {
  //       get: (errorHandler, closeHandler) => {
  //         return Promise.resolve(createConnection(connection, errorHandler, closeHandler));
  //       }
  //     }
  //   });
  // }

  // createWebSocket(wsUrl: string): WebSocket {
  //   const socketOptions = {
  //     maxReconnectionDelay: 10000,
  //     minReconnectionDelay: 1000,
  //     reconnectionDelayGrowFactor: 1.3,
  //     connectionTimeout: 10000,
  //     maxRetries: 20,
  //     debug: false
  //   };
  //   return new ReconnectingWebSocket(wsUrl, undefined, socketOptions);
  // }

 
  
  createUrl(path: string): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return normalizeUrl(`${protocol}://${location.host}${location.pathname}${path}`);
  }
  
  createWebSocket(url: string): WebSocket {
    const socketOptions = {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: Infinity,
      debug: false
    };
    return new ReconnectingWebSocket(url, undefined, socketOptions);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
