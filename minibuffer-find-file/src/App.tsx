import { useState, React, useEffect, useRef } from "react";
import { DebugConsoleMode } from "vscode";
// import reactLogo from "./assets/react.svg";
import "./App.css";
import { FixedSizeList as List } from "react-window";
import { CSSProperties } from "react";

// @ts-ignore
const vscode = acquireVsCodeApi();

function App() {
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // @ts-ignore
  const css_root = getComputedStyle(window.document.body);
  const line_height =
    parseInt(
      css_root.getPropertyValue("--vscode-editor-font-size").slice(0, -2)
    ) + 2;

  const [dirDataRaw, setDirDataRaw] = useState(null);
  const [dirData, setDirData] = useState(null);
  const [dirDataFiltered, setDirDataFiltered] = useState(null);

  const [lengthLongestFileOrDirectory, setLengthLongestFileOrDirectory] =
    useState<number>(-1);

  const [indexChoice, setIndexChoice] = useState<number>(0);
  const [iv, setIV] = useState<string>("");

  useEffect(() => {
    // @ts-ignore
    window.addEventListener("message", HandleMessages);

    // console.log(line_height);
    // const css_rootz = getComputedStyle(window.document.body);
    // const line_heightz = css_rootz.getPropertyValue('--vscode-editor-font-size');
    // console.log("Line height", line_heightz);

    return () => {
      // @ts-ignore
      window.addEventListener("message", HandleMessages);
    };
  }, []);

  function HandleMessages(event) {
    switch (event.data.command) {
      case "refactor":
        {
          setIndexChoice(0);

          let x = JSON.parse(event.data.data);
          setDirDataRaw(x);

          ParseDirData(x);
        }
        break;

      case "directory_change":
        {
          setIndexChoice(0);

          let x = JSON.parse(event.data.data);
          setDirDataRaw(x);

          ParseDirData(x);
        }
        break;
    }
  }

  function ParseDirData(dirDataRaw) {
    console.log("Raw Data", dirDataRaw);
    setDirData(dirDataRaw);
    setDirDataFiltered(dirDataRaw);
    return;
  }

  function InputOnChange(e) {
    // console.log(e.target.value);
    setIV(e.target.value);

    if (e.target.value === "") {
      setDirDataFiltered(dirData);
      setIndexChoice(0);
      window.scrollBy(0, 0);
    } else {
      // let x = [];
      // for (let i = 0; i < dirData.length - 1; ++i) {
      //   // console.log(dirData[i].name, e.target.value);
      //   if (
      //     dirData[i].name.toLowerCase().includes(e.target.value.toLowerCase())
      //   ) {
      //     x.push(dirData[i]);
      //   }
      // }
      // setDirDataFiltered(x);
      setIndexChoice(0);
      window.scrollBy(0, 0);

      vscode.postMessage({
        type: "SearchValueChange",
        value: e.target.value,
        pick_type: "directory",
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
      // console.log("Enter was pressed was presses");

      if (iv.includes(":")) {
        // most likely a change directory attempt
        vscode.postMessage({
          type: "Enter",
          value: iv,
          pick_type: "directory",
        });

        // currentDir.current = iv;
        setIV("");
        return;
      }

      let dl = dirDataFiltered[indexChoice];
      if (dl === null || dl === undefined) {
        // likely trying to create a new file
        // vscode.postMessage({
        //   type: "CreateFile",
        //   // value: currentDir,
        //   value: iv,
        //   directory: "", // currentDir.current,
        //   pick_type: "file",
        //   // directory: currentDir.current + "\\bin"
        // });
        // setIV("");
        return;
      }

      // // let dl = dirDataFiltered[indexChoice];
      // // console.log(dl);
      // let pick_type = "directory";
      // if (dl.type === "file") {
      //   // console.log("Pick file");
      //   pick_type = "file";
      //   let n = dl.name;
      //   currentDir.current = currentDir.current + "\\" + n;
      // } else {
      //   // console.log("Open Dir");
      //   pick_type = "directory";

      //   let n = dl.name;
      //   if (n === "..") {
      //     let lidx = currentDir.current.lastIndexOf("\\");
      //     if (lidx === -1) {
      //       currentDir.current = currentDir.current;
      //     } else {
      //       let check = currentDir.current.substr(0, lidx);

      //       // console.log("Check", check);
      //       currentDir.current = currentDir.current.substr(0, lidx);

      //       if (check.includes("\\")) {
      //         currentDir.current = currentDir.current.substr(0, lidx);
      //       } else {
      //         currentDir.current = currentDir.current + "\\";
      //       }
      //     }
      //   } else if (n === ".") {
      //     currentDir.current = currentDir.current;
      //   } else {
      //     if (currentDir.current[currentDir.current.length - 1] !== "\\") {
      //       currentDir.current = currentDir.current + "\\" + n;
      //     } else {
      //       currentDir.current = currentDir.current + n;
      //     }
      //   }
      // }

      // console.log("Current Dir - ", currentDir.current);

      // if (pick_type === "file") {
      //   vscode.postMessage({
      //     type: "OpenFile",
      //     // value: currentDir,
      //     value: currentDir.current,
      //     pick_type: pick_type,
      //     // directory: currentDir.current + "\\bin"
      //   });
      // } else {
      //   vscode.postMessage({
      //     type: "Enter",
      //     // value: currentDir,
      //     value: currentDir.current,
      //     pick_type: pick_type,
      //     // directory: currentDir.current + "\\bin"
      //   });
      // }

      setIV("");
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
      }
    } else if (e.keyCode === 40) {
      e.preventDefault();
      if (indexChoice !== dirDataFiltered.length - 2) {
        listRef.current!.scrollToItem(indexChoice + 1);
        setIndexChoice(indexChoice + 1);
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

      // console.log("Ctrl + G was pressed was presses");
      // console.log("Escape");
    } else if (e.keyCode === 8) {
      // backspace
      if (iv !== "") return;
      e.preventDefault();

      // console.log("Open Dir");

      // let dl = dirDataFiltered[indexChoice];
      // let n = dl.name;
      // let lidx = currentDir.current.lastIndexOf("\\");
      // if (lidx === -1) {
      //   currentDir.current = currentDir.current;
      // } else {
      //   let check = currentDir.current.substr(0, lidx);

      //   // console.log("Check", check);
      //   currentDir.current = currentDir.current.substr(0, lidx);

      //   if (check.includes("\\")) {
      //     currentDir.current = currentDir.current.substr(0, lidx);
      //   } else {
      //     currentDir.current = currentDir.current + "\\";
      //   }
      // }

      // if (currentDir.current[currentDir.current.length - 1] !== "\\") {
      //   currentDir.current = currentDir.current + "\\" + n;
      // } else {
      //   currentDir.current = currentDir.current + n;
      // }

      // console.log("Current Dir - ", currentDir.current);

      // vscode.postMessage({
      //   type: "Enter",
      //   value: currentDir.current,
      //   pick_type: "directory",
      //   // directory: currentDir.current + "\\bin"
      // });

      setIV("");

      // console.log("Backspace was pressed was presses");
      // vscode.postMessage({
      //   type: "Enter",
      //   value: iv,
      // });
      // currentDir.current = currentDir.current + "\\bin";
    }
  }

  return (
    <div className="clearfeld-minibuffer-find-file__root">
      {dirDataRaw !== null && dirDataFiltered && (
        <div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            <span>
              {indexChoice + 1}/{dirDataFiltered.length - 1}
            </span>
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
marginTop: "17px"
          }}
            //  height={150}
            //  itemCount={1000}
            //  itemSize={35}
            // width={300}
            height={line_height * 13}
            itemCount={dirDataFiltered.length - 1}
            itemSize={line_height}
            width={"100%"}
            itemData={dirDataFiltered}
            ref={listRef}
          >
            {({ index, style, data }) => {
              // console.log("abc");

              return (
                <div style={style}
                className={
                  "clearfeld-minibuffer-search-result-line clearfeld-minibuffer-find-file__result-row " +
                  (indexChoice === index &&
                    "clearfeld-minibuffer-find-file__result-current-selection ")
                }>
                  <pre>{data[index]}</pre>
                </div>
              );
            }}
          </List>

          {/* <div className="clearfeld-minibuffer-find-file__results-wrapper">
            {dirDataFiltered.map((line: string, idx: number) => {
              return (
                <div
                  key={idx}
                  className={
                    "clearfeld-minibuffer-search-result-line clearfeld-minibuffer-find-file__result-row " +
                    (indexChoice === idx &&
                      "clearfeld-minibuffer-find-file__result-current-selection ")
                  }
                >
                  <pre>{line}</pre>
                </div>
              );
            })}
          </div>
           */}
        </div>
      )}
    </div>
  );
}

export default App;
