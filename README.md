# More Search Replace and Inplace Commands for VSCode

## Dependencies
* [ripgrep](https://github.com/BurntSushi/ripgrep)

## Commands

### Consult Line

<img src="https://user-images.githubusercontent.com/49600278/211692630-01975572-1617-487a-aafa-f37e30029274.gif" alt="consult line gif" width="800" />  

#### Shortcuts - Panel

| Key | Description |
| --- | ----------- |
| `Ctrl + g` or `Esc` | Cancel - returns to position before search was started. | 
<!-- | `Enter` | Move to selected choice and close panel | -->
<!-- | &#8593; | Move choice up or loop back to last result | -->
<!-- | &#8595; | Move choice down or loop back to first result | -->

#### Configuration

| Field                           | Choices | Default |
| ------------------------------- | ----------- | ------- |
| ConslutLine_MouseClickBehaviour | `Close on selection` - Clicking on a result will move to it, and close (exit) the panel. <br/> `Enabled` - Clicking on a result will move to it, but leave the panel open. <br/> `Disabled` - Mouse click does nothing. | `Enabled` |
