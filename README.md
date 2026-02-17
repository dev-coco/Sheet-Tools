# Sheet-Tools
A multi-functional Google Sheets utility.

# Features

### 1. Sheet Management & Navigation
* **Open Sheet**: Automatically recognizes Google Sheets links or IDs from the clipboard and opens them quickly.
* **Extract Sheet ID**: Accurately extracts the Spreadsheet ID from links or `IMPORTRANGE` formulas.
* **Quick Switcher**: Retrieves all sheets in the current document in real-time. It supports keyword searching and filtering hidden sheets; click to jump to a specific sheet immediately.
* **Copy Sheet Names**: One-click to copy the names of all worksheets in the current document.

### 2. Content Processing
* **Remove Duplicates**:
    * **Single Click**: Deduplicate by rows (based on newline characters).
    * **Double Click**: Deduplicate by columns (based on tab characters).
* **Wildcard**:
    * **Single Click**: Batch add `*` to the beginning and end of clipboard content.
    * **Double Click**: Batch remove `*` from the beginning and end of content.
* **Repeat Operations**:
    * **Row Repeat**: Supports repeating content as a whole or inserting a specified number of empty rows between existing rows.
    * **Column Repeat**: Supports horizontal repetition of content or inserting a specified number of empty columns between existing columns.

### 3. Formula & Text Conversion
* **Formula Formatting**: Beautifies complex Google Sheets formulas for better readability and debugging.
* **Reference Conversion**: Quickly toggles between standard reference formats (e.g., `Sheet1!A1`) and the `INDIRECT` dynamic function format.
* **Split Function**: Splits composite curly-brace array functions (e.g., `={...}`) into multiple lines of independent formulas.
* **Smart Replace**:
    * **Single Click**: Performs a global replacement on the content within the text area.
    * **Double Click**: Performs line-by-line matching and replacement for the text area content.

# Installation & Usage

1.  Download the repository code to your local machine.
2.  Open the Chrome browser and navigate to `chrome://extensions/`.
3.  Enable **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"** and select the project folder.
5.  On any Google Sheets page, click the extension icon to open the side panel and start using the tools.

# Notes
* This tool relies on the **Clipboard API**; please ensure you have granted the necessary permissions in your browser.
* The sheet switching functionality requires the active tab to be an open Google Sheets document.
