import { useState, React, useEffect, useRef } from "react";

// import reactLogo from "./assets/react.svg";
import "./App.css";
import { FixedSizeList as List } from "react-window";
import { CSSProperties } from "react";
import { DebugConsoleMode } from "vscode";

// @ts-ignore
const vscode = acquireVsCodeApi();

// TODO: maybe have escape & ctrl+g return to the last line before search started (double check emacs consult line behaviour)
// TODO: probably should try to highlight all submatches in the visible view range of the active editor

enum MouseBehaviour {
  CLOSE_ON_SELECTION = "Close on selection",
  ENABLED = "Enabled",
  DISABLED = "Disabled",
}

function App() {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const editorRef = useRef(null);

  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );

  const [mouseBehaviour, setMouseBehaviour] = useState<MouseBehaviour>(
    MouseBehaviour.ENABLED
  );

  // @ts-ignore
  const css_root = getComputedStyle(window.document.body);
  const line_height =
    parseInt(
      css_root.getPropertyValue("--vscode-editor-font-size").slice(0, -2)
    ) + 2;

  const [dirDataFiltered, setDirDataFiltered] = useState(null);

  const [lengthLongestFileOrDirectory, setLengthLongestFileOrDirectory] =
    useState<number>(-1);

  const [indexChoice, setIndexChoice] = useState<number>(0);
  const [iv, setIV] = useState<string>("");
  const [showList, setShowList] = useState<boolean>(false);

  useEffect(() => {
    // @ts-ignore
    window.addEventListener("message", HandleMessages);
    window.addEventListener("resize", handleResize);

    return () => {
      // @ts-ignore
      window.addEventListener("message", HandleMessages);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handleResize() {
    setWindowDimensions(getWindowDimensions());
  }

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  }

  function HandleMessages(event: any) {
    switch (event.data.command) {
      case "cp_results":
        {
          setIndexChoice(0);
          // console.log("RawRawRaw Data", event.data.data);

          // console.log("line", event.data.line);
          let x = event.data.data;
          if (x[0] === "") {
            setShowList(false);
            setDirDataFiltered(x);

            // console.log("CONFIG - ", event.data.configuration);
            if (
              event.data.configuration !== undefined &&
              event.data.configuration !== null
            ) {
              switch (event.data.configuration.MouseBehaviour) {
                case MouseBehaviour.CLOSE_ON_SELECTION:
                  setMouseBehaviour(MouseBehaviour.CLOSE_ON_SELECTION);
                  break;
                case MouseBehaviour.ENABLED:
                  setMouseBehaviour(MouseBehaviour.ENABLED);
                  break;
                case MouseBehaviour.DISABLED:
                  setMouseBehaviour(MouseBehaviour.DISABLED);
                  break;
              }
            }

            return;
          }

          let idx = x.length - 1;

          // console.log(x, idx);

          // Sometimes the last element in the ripgrep json will be an empty line
          if (x[idx] === "") {
            x.pop();
            idx -= 1;
          }

          // removing all none match types from array
          while (true) {
            if (JSON.parse(x[idx]).type !== "match") {
              x.pop();
              idx -= 1;
            } else {
              break;
            }
          }
          // cont...
          if (JSON.parse(x[0]).type !== "match") {
            x.shift();
          }

          // console.log(x);
          let res = BinarySearchNearest(x, event.data.line);
          // console.log("res bsn - ", res);

          let sort = [...x.slice(res, x.length), ...x.slice(0, res)];

          // console.log(sort);

          setDirDataFiltered(sort);
          setShowList(true);

          if(editorRef.current === null) {
            editorRef.current = event.data.editor;
          }

          const parsed_res = JSON.parse(sort[0]);
          vscode.postMessage({
            type: "MoveToLine",
            value: parsed_res.data.line_number,
            start_pos: parsed_res.data.submatches[0].start,
            end_pos: parsed_res.data.submatches[0].end,
            index: 0
          });
        }
        break;
    }
  }

  function BinarySearchNearest(arr: [], line: number): number {
    let start = 0;
    let end = arr.length - 1;
    let mid; //  = Math.floor((start + end) / 2);

    while (start <= end) {
      mid = Math.floor((start + end) / 2);
      // console.log("MSE ", mid, start, end);

      if (mid + 1 === end || mid - 1 === start) {
        // nearest or exact match
        return mid;
      }

      const ap = JSON.parse(arr[mid]);
      if (ap.type !== "match") {
        // TODO: test this out a bit for desired behaviour
        // this probably isn't needed anymore double check and test
        return mid; // -1
      }

      // console.log("Line numbers - ", ap.data.line_number, line);
      if (line < ap.data.line_number) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    // TODO: testing
    // If error just default to using first_index
    return 0;
  }

  function InputOnChange(e) {
    // console.log(e.target.value);
    setIV(e.target.value);

    if (e.target.value === "") {
      // setDirDataFiltered(dirData);
      setIndexChoice(0);
      window.scrollBy(0, 0);

      vscode.postMessage({
        type: "SearchValueChange",
        value: "",
      });

      setShowList(false);
      // setDirDataFiltered([""]);

    } else {
      setIndexChoice(0);
      window.scrollBy(0, 0);

      vscode.postMessage({
        type: "SearchValueChange",
        value: e.target.value,
      });
    }
  }

  function InputOnBlur(): void {
    if (inputRef !== null && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }

  function InputOnKeyPress(e): void {
    // console.log("handle key press - ", e.key);
    if (e.key === "Escape") {
      e.preventDefault();
      console.log("Escape was pressed");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const parsed_res = JSON.parse(dirDataFiltered[indexChoice]);

      vscode.postMessage({
        type: "Enter",
        value: parsed_res.data.line_number,
        start_pos: parsed_res.data.submatches[0].start,
        end_pos: parsed_res.data.submatches[0].end,
      });

      return;
    }
  }

  function InputOnKeyDown(e) {
    // console.log(e.keyCode);

    if (e.keyCode === 38) {
      e.preventDefault();
      if (indexChoice !== 0) {
        MoveToIndexChoiceLine(indexChoice - 1);
      } else {
        MoveToIndexChoiceLine(dirDataFiltered.length - 1);
      }
    } else if (e.keyCode === 40) {
      e.preventDefault();
      if (indexChoice !== dirDataFiltered.length - 1) {
        MoveToIndexChoiceLine(indexChoice + 1);
      } else {
        MoveToIndexChoiceLine(0);
      }
    } else if ((e.ctrlKey && e.keyCode === 71) || e.keyCode === 27) {
      // ctrl + g || escape
      e.preventDefault();

      vscode.postMessage({
        type: "Quit",
      });

      return;
    }
  }

  function MoveToIndexChoiceLine(idx: number): void {
    listRef.current!.scrollToItem(idx);
    setIndexChoice(idx);

    if(editorRef.current) {
      console.log("Visible rangesZ - ", editorRef.current.visibleRanges);
    }

    const parsed_res = JSON.parse(dirDataFiltered[idx]);

    vscode.postMessage({
      type: "MoveToLine",
      value: parsed_res.data.line_number,
      start_pos: parsed_res.data.submatches[0].start,
      end_pos: parsed_res.data.submatches[0].end,
      index: idx,
    });
  }

  function GenerateLineWithHighlights(LineObject: any) {
    const line = LineObject.lines.text;
    let line_poritions = [];
    let str_start = 0;

    for (let i = 0; i < LineObject.submatches.length; ++i) {
      line_poritions.push({
        highlight: false,
        value: line.substr(
          str_start,
          LineObject.submatches[i].start - str_start
        ),
      });

      line_poritions.push({
        highlight: true,
        value: line.substr(
          LineObject.submatches[i].start,
          LineObject.submatches[i].end - LineObject.submatches[i].start
        ),
      });

      str_start = LineObject.submatches[i].end;
    }

    line_poritions.push({
      highlight: false,
      value: line.substr(str_start, line.length - 1),
    });

    return (
      <pre className="clearfeld-webview-consult-line__list-search-result-row">
        <span className="clearfeld-webview-consult-line__list-search-result-line-number-color-below">
          {LineObject.line_number}:
        </span>
        {line_poritions.map((line_block: any, lidx: number) => {
          if (line_block.highlight) {
            return (
              <span className="clearfeld-webview-consult-line__list-search-result-highlight">
                {line_block.value}
              </span>
            );
          } else {
            return line_block.value;
          }
        })}
      </pre>
    );
  }

  function OnResultClick(
    e: React.MouseEvent<HTMLElement>,
    index: number
  ): void {
    switch (mouseBehaviour) {
      case MouseBehaviour.CLOSE_ON_SELECTION:
        {
          setIndexChoice(index);
          listRef.current!.scrollToItem(index);

          const parsed_res = JSON.parse(dirDataFiltered[index]);
          vscode.postMessage({
            type: "MoveToLine",
            value: parsed_res.data.line_number,
            start_pos: parsed_res.data.submatches[0].start,
            end_pos: parsed_res.data.submatches[0].end,
            index: index,
          });

          vscode.postMessage({
            type: "Quit",
          });
        }
        break;

      case MouseBehaviour.ENABLED:
        {
          setIndexChoice(index);
          listRef.current!.scrollToItem(index);

          const parsed_res = JSON.parse(dirDataFiltered[index]);
          vscode.postMessage({
            type: "MoveToLine",
            value: parsed_res.data.line_number,
            start_pos: parsed_res.data.submatches[0].start,
            end_pos: parsed_res.data.submatches[0].end,
            index: index,
          });
        }
        break;

      // case MouseBehaviour.DISABLED:
      //
      // break;
    }
  }

  return (
    <div className="clearfeld-minibuffer-find-file__root">
      {dirDataFiltered && (
        <div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            {!showList ? (
              <span>!/0</span>
            ) : (
              <span>
                {indexChoice + 1}/{dirDataFiltered.length}
              </span>
            )}
            <span> Go to line: </span>
            <input
              className="clearfeld-minibuffer-find-file__input"
              ref={inputRef}
              autoFocus={true}
              type="text"
              onBlur={InputOnBlur}
              onChange={InputOnChange}
              onKeyPress={InputOnKeyPress}
              onKeyDown={InputOnKeyDown}
              value={iv}
            />
          </div>

          {showList && (
            <List
              style={{
                marginTop: `${line_height + 2}px`,
              }}
              height={windowDimensions.height - (line_height + 6)}
              itemCount={dirDataFiltered.length}
              itemSize={line_height}
              width={"100%"}
              itemData={dirDataFiltered}
              ref={listRef}
            >
              {({ index, style, data }) => {
                // if(data[index] === "") return null;

                const parsed_data = JSON.parse(data[index]);
                // if (parsed_data.type !== "match") {
                //   return null;
                // }

                return (
                  <div
                    style={style}
                    className={
                      "clearfeld-minibuffer-search-result-line clearfeld-minibuffer-find-file__result-row " +
                      (indexChoice === index &&
                        "clearfeld-minibuffer-find-file__result-current-selection ")
                    }
                    onClick={(e) => OnResultClick(e, index)}
                    role="Button"
                  >
                    {GenerateLineWithHighlights(parsed_data.data)}
                  </div>
                );
              }}
            </List>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
