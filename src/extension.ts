import * as vscode from "vscode";
// @ts-ignore
import * as Path from "path";
// @ts-ignore
import * as cp from "child_process";

let defaultDir: string | null = null;

async function pathToCurrentFile(): Promise<string | null> {
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor) {
    return currentEditor.document.uri.fsPath;
  }

  return null;
}

function IsPlatformWindows() {
  return process.platform === "win32";
}

let ConsuleLine_MouseClickBehaviour: string;
function PullConfigurationAndSet(): void {
  const sric_config = vscode.workspace.getConfiguration(
    "clearfeld-sri-commands"
  );
  ConsuleLine_MouseClickBehaviour =
    (sric_config.get("ConslutLine_MouseClickBehaviour") as string) ?? "Enabled";
}

const SearchResultDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: "var(--vscode-editor-findMatchHighlightBackground)",
  }
);

const WholeLineDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: "var(--vscode-list-inactiveSelectionBackground)",
});

function GetCurrentLineInActiveEditor(): number {
  const editor = vscode.window.activeTextEditor;
  if (editor != null) {
    return editor.selection.active.line;
    // console.log(editor.selection.active.line);
  } else {
    return 0;
  }
}
// const largeNumberDecorationType = vscode.window.createTextEditorDecorationType({
//   cursor: "crosshair",
//   // use a themable color. See package.json for the declaration and default values.
//   backgroundColor: "red", // { id: 'myextension.largeNumberBackground' }
// });

export function activate(context: vscode.ExtensionContext) {
  PullConfigurationAndSet();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clearfeld-sri-commands")) {
        PullConfigurationAndSet();
      }
    })
  );

  // @ts-ignore
  const provider = new ColorsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ColorsViewProvider.viewType,
      provider
    )
  );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("clearfeld.findFileEditor", async () => {
  //     provider.createCatCodingView();

  //     if (!provider._panel) {
  //       return;
  //     }

  //     let defaultDir = await pathToCurrentFile();
  //     console.log("defaultDir - ", defaultDir);

  //     let cmd = "cd && dir /o";
  //     let dir = null;

  //     if (defaultDir !== null) {
  //       defaultDir += Path.sep;
  //       dir = vscode.Uri.file(defaultDir);
  //       defaultDir = defaultDir.substr(1, defaultDir.length - 2);
  //       defaultDir = defaultDir.replaceAll("/", "\\");
  //       // cmd = `cd ${defaultDir} && dir /o`;
  //       cmd = `dir /o ${defaultDir}`;
  //     } else {
  //       defaultDir = EXT_DefaultDirectory;
  //     }
  //     console.log("defaultDir - ", defaultDir);

  //     // // enable this to get dir of active editor
  //     // if (dir !== null) {
  //     //   // console.log(defaultDir);
  //     //   let dirx = defaultDir?.substring(1, defaultDir.length - 1);
  //     //   cmd = `cd ${dirx} && dir /o ${dirx}`;
  //     //   console.log(cmd);
  //     //   //cmd = cmd + " " + defaultDir?.substring(1, defaultDir.length - 1);
  //     // }

  //     cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
  //       console.log("stdout: " + stdout);
  //       console.log("stderr: " + stderr);
  //       if (err) {
  //         console.log("error: " + err);
  //       } else {
  //         const result = stdout.split(/\r?\n/);
  //         provider._panel?.webview.postMessage({
  //           command: "refactor",
  //           data: JSON.stringify(result),
  //           directory: JSON.stringify(defaultDir),
  //         });
  //       }
  //     });
  //   })
  // );

  // Our new command
  context.subscriptions.push(
    vscode.commands.registerCommand("clearfeld.consultLine", async () => {
      defaultDir = await pathToCurrentFile();
      console.log("defaultDir - ", defaultDir);
      if (defaultDir === null) {
        console.warn("TODO: print error to user");
        return;
      }

      let cmd = `rg "" "${defaultDir}" --json -i`;

      let dir = null;

      /// TODO: investigate this more this seems too hackish to leave as is
      let throw_away = null;
      throw_away = await vscode.commands.executeCommand(
        "setContext",
        "clearfeld.consultLine",
        true
      );
      throw_away = await vscode.commands.executeCommand(
        "clearfeld.minibufferViewConsultLine.focus"
      );
      throw_away = await vscode.commands.executeCommand(
        "clearfeld.minibufferViewConsultLine.focus"
      );
      ///

      if (!provider._view) {
        return;
      }

      provider._view.show(true);

      // console.log("ConsuleLine_MouseClickBehaviour - ", ConsuleLine_MouseClickBehaviour);
      provider._view?.webview.postMessage({
        command: "cp_results",
        data: [""],
        line: GetCurrentLineInActiveEditor(),
        configuration: {
          MouseBehaviour: ConsuleLine_MouseClickBehaviour,
        },
        editor: vscode.window.activeTextEditor,
      });
      return;
      // // this.rgProc = cp.spawn(rgPath, rgArgs.args, { cwd: rootFolder });

      // cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
      //   // cp.exec(`cd && ls -al --group-directories-first C:\\ | awk '{print $9 "\`" $1 "\`" $5 "\`" $6" "$7" "$8}'`, (err: any, stdout: any, stderr: any) => {
      //   console.log("stdout: " + stdout);
      //   console.log("stderr: " + stderr);
      //   if (err) {
      //     console.log("error: " + err);
      //   } else {
      //     // get current theme properties color
      //     // respect theme color choice
      //     // const color = new vscode.ThemeColor('badge.background');

      //     const result = stdout.split(/\r?\n/);
      //     provider._view?.webview.postMessage({
      //       command: "cp_results",
      //       data: result,
      //       directory: JSON.stringify(defaultDir),
      //     });
      //   }
      // });

      // // // Send a message to our webview.
      // // // You can send any JSON serializable data.
      // // provider._view.webview.postMessage({
      // //   command: "refactor",
      // //   data: dir,
      // // });
    })
  );
}

let _ripgrep_results;
class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "clearfeld.minibufferViewConsultLine";

  public _view?: vscode.WebviewView;
  public _panel?: vscode.WebviewPanel;

  private readonly webview_options = {
    enableScripts: true,

    localResourceRoots: [
      this._extensionUri,
      vscode.Uri.joinPath(
        this._extensionUri,
        "minibuffer-find-file/dist",
        "minibuffer-find-file/dist/assets"
      ),
    ],
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _myUri: vscode.Uri
  ) {}

  // public createCatCodingView() {
  //   // _token: vscode.CancellationToken // context: vscode.WebviewViewResolveContext, // webviewView: vscode.WebviewView,
  //   // Create and show panel
  //   // let vuri = new vscode.Uri;
  //   this._panel = vscode.window.createWebviewPanel(
  //     "clearfeld.findFileView",
  //     // "my-fancy-view",// this.viewType, // "catCoding",
  //     "Minibuffer: File Open",
  //     vscode.ViewColumn.Active,
  //     this.webview_options
  //   );

  //   // And set its HTML content
  //   this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

  //   this._panel.webview.onDidReceiveMessage(async (data) => {
  //     switch (data.type) {
  //       case "OpenFile":
  //         {
  //           console.log("data.value - ", data.value);
  //           vscode.workspace.openTextDocument(data.value).then((document) => {
  //             vscode.window.showTextDocument(document);
  //             this._panel?.dispose();
  //           });
  //         }
  //         break;

  //       case "CreateFile":
  //         {
  //           let buf = new Uint8Array();
  //           let duri = vscode.Uri.file(data.directory + "\\" + data.value);
  //           let throw_away = await vscode.workspace.fs.writeFile(duri, buf);
  //           // @ts-ignore
  //           const openPath = vscode.Uri.parse(duri);
  //           vscode.workspace.openTextDocument(openPath).then((document) => {
  //             vscode.window.showTextDocument(document);
  //             this._panel?.dispose();
  //           });
  //         }
  //         break;

  //       case "Enter": {
  //         cp.exec(
  //           `dir /o "${data.value}"`,
  //           (err: any, stdout: any, stderr: any) => {
  //             // console.log("stderr: " + stderr);
  //             if (err) {
  //               console.log("stderr - error: " + err);
  //             } else {
  //               console.log("stdout - " + stdout);
  //               // get current theme properties color
  //               // respect theme color choice
  //               // const color = new vscode.ThemeColor('badge.background');

  //               const result = stdout.split(/\r?\n/);
  //               this._panel?.webview.postMessage({
  //                 command: "directory_change",
  //                 data: JSON.stringify(result),
  //               });
  //             }
  //           }
  //         );

  //         break;
  //       }

  //       case "Quit":
  //         {
  //           this._panel?.dispose();
  //         }
  //         break;
  //     }
  //   });
  // }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    // return;

    this._view = webviewView;

    webviewView.webview.options = this.webview_options;

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._view?.onDidDispose((data) => {
      // switch (data.type)
      console.log("view panel disposed - ", data);
    });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "colorSelected": {
          vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(`#${data.value}`)
          );
          break;
        }

        case "SearchValueChange":
          {
            if (defaultDir === null) return;

            if (data.value === "") {
              const editor = vscode.window.activeTextEditor;

              if (editor) {
                editor.setDecorations(SearchResultDecorationType, []);
                editor.setDecorations(WholeLineDecorationType, []);
              }

              return;
            }


            let cmd = `rg "${data.value}" "${defaultDir}" --json -i`;

            cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
              // console.log("stderr: " + stderr);
              if (err) {
                console.log("stderr - error: " + err);

                this._view?.webview.postMessage({
                  command: "cp_results",
                  data: [""],
                  line: GetCurrentLineInActiveEditor(),
                });
              } else {
                // console.log("stdout - " + stdout);
                // get current theme properties color
                // respect theme color choice
                // const color = new vscode.ThemeColor('badge.background');

                _ripgrep_results = stdout.split(/\r?\n/);
                this._view?.webview.postMessage({
                  command: "cp_results",
                  data: _ripgrep_results, // JSON.stringify(result),
                  line: GetCurrentLineInActiveEditor(),
                });

                // // mmove to line
                // if (result.length > 1) {
                //   const parse_res = JSON.parse(result[1]);
                //   if (parse_res.type === "match") {
                //     const editor = vscode.window.activeTextEditor;
                //     if (editor) {
                //       const line = parse_res.data.line_number - 1;

                //       const range = editor.document.lineAt(line).range;

                //       const new_range = new vscode.Range(
                //         line,
                //         parse_res.data.submatches[0].start,
                //         line,
                //         parse_res.data.submatches[0].end
                //       );

                //       // editor.selection = new vscode.Selection(range.start, range.end);
                //       editor.selection = new vscode.Selection(
                //         new_range.start,
                //         new_range.start
                //       );

                //       const smallNumbers: vscode.DecorationOptions[] = [];
                //       const largeNumbers: vscode.DecorationOptions[] = [];
                //       const decoration = {
                //         range: new vscode.Range(new_range.start, new_range.end),
                //       };
                //       smallNumbers.push(decoration);
                //       const decorationz = {
                //         range: new vscode.Range(
                //           new_range.start,
                //           new_range.start
                //         ),
                //       };
                //       largeNumbers.push(decorationz);
                //       editor.setDecorations(
                //         SearchResultDecorationType,
                //         smallNumbers
                //       );
                //       editor.setDecorations(
                //         WholeLineDecorationType,
                //         largeNumbers
                //       );

                //       editor.revealRange(range);
                //     }
                //   }
                // }
              }
            });
          }
          break;

        case "MoveToLine":
          {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              const line = data.value - 1;
              const range = editor.document.lineAt(line).range;

              const new_range = new vscode.Range(
                line,
                data.start_pos,
                line,
                data.end_pos
              );

              // editor.selection = new vscode.Selection(range.start, range.end);
              editor.selection = new vscode.Selection(
                new_range.start,
                new_range.start
              );
              editor.revealRange(range);

              const vis_range = editor.visibleRanges;
              const visible_line_amount =
                vis_range[0].e.c - vis_range[0].c.c + 1;
              const bsn_idx = data.index + 1; // Adding 1 for the shift done  in the webview on the results
              const line_min = line - visible_line_amount;
              const line_max = line + visible_line_amount;

              // console.log("Visible Lines - ", vis_range);
              // console.log("_ripgrep_results - ", _ripgrep_results);
              // // console.log("Visible Line Range amount - ", vis_range[0]);
              // console.log("Visible Line Range amount - ", vis_range[0].e.c - vis_range[0].c.c);

              const smallNumbers: vscode.DecorationOptions[] = [];
              const largeNumbers: vscode.DecorationOptions[] = [];

              const decoration = {
                range: new vscode.Range(new_range.start, new_range.end),
              };
              smallNumbers.push(decoration);

              let idx = bsn_idx;
              // console.log(_ripgrep_results, idx, bsn_idx, data);

              const rplen: number = _ripgrep_results.length;

              for (;;) {
                // console.log(_ripgrep_results[idx]);
                const pr = JSON.parse(_ripgrep_results[idx]);
                // console.log("pr", pr);
                if (pr.type !== "match" || pr.data.line_number < line_min) {
                  break;
                }

                for (let i = 0; i < pr.data.submatches.length; ++i) {
                  const _new_range = new vscode.Range(
                    pr.data.line_number - 1,
                    pr.data.submatches[i].start,
                    pr.data.line_number - 1,
                    pr.data.submatches[i].end
                  );

                  smallNumbers.push({
                    range: new vscode.Range(_new_range.start, _new_range.end),
                  });
                }

                idx -= 1;
                if (idx === -1) {
                  break;
                }
              }

              idx = bsn_idx;
              if (idx < rplen) {
                for (;;) {
                  // console.log(_ripgrep_results[idx]);
                  const pr = JSON.parse(_ripgrep_results[idx]);
                  // console.log("pr", pr);
                  if (pr.type !== "match" || pr.data.line_number > line_max) {
                    break;
                  }

                  for (let i = 0; i < pr.data.submatches.length; ++i) {
                    const _new_range = new vscode.Range(
                      pr.data.line_number - 1,
                      pr.data.submatches[i].start,
                      pr.data.line_number - 1,
                      pr.data.submatches[i].end
                    );

                    smallNumbers.push({
                      range: new vscode.Range(_new_range.start, _new_range.end),
                    });
                  }

                  idx += 1;
                  if (idx >= rplen) {
                    break;
                  }
                }
              }

              const decorationz = {
                range: new vscode.Range(new_range.start, new_range.start),
              };
              largeNumbers.push(decorationz);

              editor.setDecorations(SearchResultDecorationType, smallNumbers);
              editor.setDecorations(WholeLineDecorationType, largeNumbers);

              // editor.revealRange(range);
            }
          }
          break;

        case "Enter":
          {
            this._view = undefined;
            vscode.commands.executeCommand(
              "setContext",
              "clearfeld.consultLine",
              false
            );

            const editor = vscode.window.activeTextEditor;
            if (editor) {
              const line = data.value - 1;
              const range = editor.document.lineAt(line).range;

              const new_range = new vscode.Range(
                line,
                data.start_pos,
                line,
                data.end_pos
              );

              // editor.selection = new vscode.Selection(range.start, range.end);
              editor.selection = new vscode.Selection(
                new_range.start,
                new_range.start
              );

              editor.setDecorations(SearchResultDecorationType, []);
              editor.setDecorations(WholeLineDecorationType, []);

              editor.revealRange(range);
            }

            ClosePanelOnCompletionIfNotInitiallyOpened();
          }
          break;

        case "Quit":
          {
            this._view = undefined;
            vscode.commands.executeCommand(
              "setContext",
              "clearfeld.consultLine",
              false
            );

            const editor = vscode.window.activeTextEditor;
            if (editor) {
              editor.setDecorations(SearchResultDecorationType, []);
              editor.setDecorations(WholeLineDecorationType, []);
            }

            ClosePanelOnCompletionIfNotInitiallyOpened();
          }
          break;
      }
    });
  }

  public _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webviews/consult-line/dist",
        "view-consult-line.js"
      )
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webviews/consult-line/dist/assets",
        "style.css"
      )
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<div id="root"><div/>
				<div id="shi"><div/>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function ClosePanelOnCompletionIfNotInitiallyOpened(): void {
  // TODO: figure out how to check if panel was open prior to invoking the find file command
  // conditionally close the panel if it wasnt open before otherwise move back to whatever view in the panel was last active
  vscode.commands.executeCommand("workbench.action.togglePanel");
}
