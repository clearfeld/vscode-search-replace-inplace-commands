"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
// import reactLogo from "./assets/react.svg";
require("./App.css");
const react_window_1 = require("react-window");
// @ts-ignore
const vscode = acquireVsCodeApi();
// TODO: maybe have escape & ctrl+g return to the last line before search started
function App() {
    const inputRef = (0, react_1.useRef)(null);
    const listRef = (0, react_1.useRef)(null);
    // @ts-ignore
    const css_root = getComputedStyle(window.document.body);
    const line_height = parseInt(css_root.getPropertyValue("--vscode-editor-font-size").slice(0, -2)) + 2;
    const [dirDataFiltered, setDirDataFiltered] = (0, react_1.useState)(null);
    const [lengthLongestFileOrDirectory, setLengthLongestFileOrDirectory] = (0, react_1.useState)(-1);
    const [indexChoice, setIndexChoice] = (0, react_1.useState)(0);
    const [iv, setIV] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        // @ts-ignore
        window.addEventListener("message", HandleMessages);
        return () => {
            // @ts-ignore
            window.addEventListener("message", HandleMessages);
        };
    }, []);
    function HandleMessages(event) {
        switch (event.data.command) {
            case "cp_results":
                {
                    setIndexChoice(0);
                    // console.log("RawRawRaw Data", event.data.data);
                    console.log("line", event.data.line);
                    let x = event.data.data;
                    if (x[0] === "") {
                        setDirDataFiltered(x);
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
                        }
                        else {
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
                    const parsed_res = JSON.parse(sort[0]);
                    vscode.postMessage({
                        type: "MoveToLine",
                        value: parsed_res.data.line_number,
                        start_pos: parsed_res.data.submatches[0].start,
                        end_pos: parsed_res.data.submatches[0].end,
                    });
                }
                break;
        }
    }
    function BinarySearchNearest(arr, line) {
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
                return mid; // -1
            }
            // console.log("Line numbers - ", ap.data.line_number, line);
            if (line < ap.data.line_number) {
                end = mid - 1;
            }
            else {
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
        }
        else {
            setIndexChoice(0);
            window.scrollBy(0, 0);
            vscode.postMessage({
                type: "SearchValueChange",
                value: e.target.value,
            });
        }
    }
    function InputOnBlur() {
        if (inputRef !== null && inputRef.current !== null) {
            inputRef.current.focus();
        }
    }
    function InputOnKeyPress(e) {
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
                listRef.current.scrollToItem(indexChoice - 1);
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
        }
        else if (e.keyCode === 40) {
            e.preventDefault();
            if (indexChoice !== dirDataFiltered.length - 1) {
                listRef.current.scrollToItem(indexChoice + 1);
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
        }
        else if ((e.ctrlKey && e.keyCode === 71) || e.keyCode === 27) {
            // ctrl + g || escape
            e.preventDefault();
            vscode.postMessage({
                type: "Quit",
            });
            return;
        }
    }
    function GenerateLineWithHighlights(LineObject) {
        const line = LineObject.lines.text;
        let line_poritions = [];
        let str_start = 0;
        for (let i = 0; i < LineObject.submatches.length; ++i) {
            line_poritions.push({
                highlight: false,
                value: line.substr(str_start, LineObject.submatches[i].start - str_start),
            });
            line_poritions.push({
                highlight: true,
                value: line.substr(LineObject.submatches[i].start, LineObject.submatches[i].end - LineObject.submatches[i].start),
            });
            str_start = LineObject.submatches[i].end;
        }
        line_poritions.push({
            highlight: false,
            value: line.substr(str_start, line.length - 1),
        });
        return (<pre style={{
                display: "flex",
            }}>
        <span style={{
                color: "var(--vscode-editorLineNumber-foreground)",
            }}>
          {LineObject.line_number}:
        </span>
        {line_poritions.map((line_block, lidx) => {
                if (line_block.highlight) {
                    return (<span style={{
                            backgroundColor: "var(--vscode-terminal-findMatchHighlightBackground)",
                        }}>
                {line_block.value}
              </span>);
                }
                else {
                    return line_block.value;
                }
            })}
      </pre>);
    }
    return (<div className="clearfeld-minibuffer-find-file__root">
      {dirDataFiltered && (<div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            {dirDataFiltered.length === 0 ? (<span>!/0</span>) : (<span>
                {indexChoice + 1}/{dirDataFiltered.length - 1}
              </span>)}
            <span> Go to line: </span>
            <input className="clearfeld-minibuffer-find-file__input" ref={inputRef} autoFocus={true} type="text" onBlur={InputOnBlur} onChange={InputOnChange} onKeyPress={InputOnKeyPress} onKeyDown={InputOnKeyDown} value={iv}/>
          </div>

          <react_window_1.FixedSizeList style={{
                marginTop: "17px",
            }} height={line_height * 13} itemCount={dirDataFiltered.length - 1} itemSize={line_height} width={"100%"} itemData={dirDataFiltered} ref={listRef}>
            {({ index, style, data }) => {
                const parsed_data = JSON.parse(data[index]);
                if (parsed_data.type !== "match") {
                    return null;
                }
                return (<div style={style} className={"clearfeld-minibuffer-search-result-line clearfeld-minibuffer-find-file__result-row " +
                        (indexChoice === index &&
                            "clearfeld-minibuffer-find-file__result-current-selection ")}>
                  {GenerateLineWithHighlights(parsed_data.data)}
                </div>);
            }}
          </react_window_1.FixedSizeList>
        </div>)}
    </div>);
}
exports.default = App;
//# sourceMappingURL=App.js.map