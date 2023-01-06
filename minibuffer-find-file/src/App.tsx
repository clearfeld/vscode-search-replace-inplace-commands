import { useState, React, useEffect, useRef } from "react";
import { DebugConsoleMode } from "vscode";
// import reactLogo from "./assets/react.svg";
import "./App.css";
import { FixedSizeList as List } from "react-window";
import { CSSProperties } from "react";

// @ts-ignore
const vscode = acquireVsCodeApi();

// NOTE: rg --json produces an empty line, a summary line, begin and end lines
// so we take off 3 from the array size to get total lines that count matches
// the first none used line is shifted in the initial cp_res message handle
const RG_TOTAL_OFFSET = 4 - 1;

function App() {
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

  useEffect(() => {
    // @ts-ignore
    window.addEventListener("message", HandleMessages);

    return () => {
      // @ts-ignore
      window.addEventListener("message", HandleMessages);
    };
  }, []);

  function HandleMessages(event: any) {
    switch (event.data.command) {
      case "cp_results":
        {
          setIndexChoice(0);
          // console.log("RawRawRaw Data", event.data.data);

          let x = event.data.data;
          x.shift();

          setDirDataFiltered(x);
        }
        break;
    }
  }

  function InputOnChange(e) {
    // console.log(e.target.value);
    setIV(e.target.value);

    if (e.target.value === "") {
      // setDirDataFiltered(dirData);
      setIndexChoice(0);
      window.scrollBy(0, 0);
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
        setIndexChoice(indexChoice - 1);
        // window.scrollBy(0, -line_height);
        listRef.current!.scrollToItem(indexChoice - 1);
        // listRef.current.scrollBy(0, -line_height);

        // console.log(dirDataFiltered[indexChoice - 1]);
        // console.log(dirDataFiltered[indexChoice - 1].split(":")[0]);

        const parsed_res = JSON.parse(dirDataFiltered[indexChoice - 1]);

        vscode.postMessage({
          type: "MoveToLine",
          value: parsed_res.data.line_number,
          start_pos: parsed_res.data.submatches[0].start,
          end_pos: parsed_res.data.submatches[0].end,
        });
      }
    } else if (e.keyCode === 40) {
      e.preventDefault();
      if (indexChoice !== dirDataFiltered.length - RG_TOTAL_OFFSET - 1) {
        listRef.current!.scrollToItem(indexChoice + 1);
        setIndexChoice(indexChoice + 1);

        const parsed_res = JSON.parse(dirDataFiltered[indexChoice + 1]);

        vscode.postMessage({
          type: "MoveToLine",
          value: parsed_res.data.line_number,
          start_pos: parsed_res.data.submatches[0].start,
          end_pos: parsed_res.data.submatches[0].end,
        });

        // window.scrollBy(0, line_height);
        // listRef.current.scrollBy(0, line_height);
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
      <pre
        style={{
          display: "flex",
        }}
      >
        <span
          style={{
            color: "var(--vscode-editorLineNumber-foreground)",
          }}
        >
          {LineObject.line_number}:
        </span>
        {line_poritions.map((line_block: any, lidx: number) => {
          if (line_block.highlight) {
            return (
              <span
                style={{
                  backgroundColor:
                    "var(--vscode-terminal-findMatchHighlightBackground)",
                }}
              >
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

  return (
    <div className="clearfeld-minibuffer-find-file__root">
      {dirDataFiltered && (
        <div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            {dirDataFiltered.length === 0 ? (
              <span>
                !/0
              </span>
            ) : (
              <span>
                {indexChoice + 1}/{dirDataFiltered.length - RG_TOTAL_OFFSET}
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

          <List
            style={{
              marginTop: "17px",
            }}
            height={line_height * 13}
            itemCount={dirDataFiltered.length - RG_TOTAL_OFFSET}
            itemSize={line_height}
            width={"100%"}
            itemData={dirDataFiltered}
            ref={listRef}
          >
            {({ index, style, data }) => {
              const parsed_data = JSON.parse(data[index]);
              if (parsed_data.type !== "match") {
                return null;
              }

              return (
                <div
                  style={style}
                  className={
                    "clearfeld-minibuffer-search-result-line clearfeld-minibuffer-find-file__result-row " +
                    (indexChoice === index &&
                      "clearfeld-minibuffer-find-file__result-current-selection ")
                  }
                >
                  {GenerateLineWithHighlights(parsed_data.data)}
                </div>
              );
            }}
          </List>
        </div>
      )}
    </div>
  );
}

export default App;
