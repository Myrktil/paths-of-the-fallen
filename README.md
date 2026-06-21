<h1 align="center"> Paths of the Fallen </h1>

*Paths of the Fallen* is an open source interactive map maker, focused on tracking the paths of characters from books or shows while spoiling as little as possible. It contains a GUI for editing paths without editing any code and allows you to host the static website by itself without requiring an additional database or backend.  
**Disclaimer:** This tool was originally built for personal use and only acidentally ended up in a distributable state. If you want to make an interactive map, I suggest also checking out professional alternatives such as [Leaflet](https://leafletjs.com/) before settling with my tool. If you decide to use it anyway, consider letting me know by giving the repository a star and check out the "Suggesting improvements" section in this README to find out how I can help you with any issues you might have.  

## Installation
To use *Paths of the Fallen*, download the latest version from the releases in this repository and extract the files.

### Running the website
Due to CORS security policy, you can **not** simply run the index.html file by opening it with your browser. Instead, you need to host it on a remote or local server. If you don't already have a server to host your website on, I suggest using Visual Studio Code with the "Live Server" extension during development.

Install [Visual Studio Code](https://code.visualstudio.com/) and the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension. Open your website folder in Visual Studio Code, right click index.html and select "Open with Live Server". After you have done that, you will be able to access your website by typing "localhost:5500" into your browser's address bar. 

### Configuring the website

You can configure the website by editing the config.json file in the data/ folder. Setting MAP_IMAGE_FILE is required for the website to run, the other settings are optional.

| Setting | Effect | Options |
|----------|----------|----------|
| MAP_IMAGE_FILE | The filename of the background map image **including file extension.** | "\<FILENAME>.\<FILEXTENSION>" |
| INITIAL_ZOOM | The initial scale of the map after loading the webpage. | \<any number> |
| MIN_ZOOM | The minimun map scale reachable by user scrolling. | \<any number> |
| MAX_ZOOM | The maximum map scale reachable by user scrolling. | \<any number> |
| LOGO_ICON_FILE | The filename of the icon displayed in the top right corner **including file extension**. Leave empty to display no icon. | "\<FILENAME>.\<FILEXTENSION>" |
| LOGO_STRING | Text to be displayed in the top right corner. Leave empty to use page title or set to "none" to display no text. | "" <br> "none" <br> "\<your text>"|
| SLIDER_ICON_FILE | Filename of the icon used for the sliders controlling what is displayed **including file extension. Suggested aspect ratio is 1:1.** Leave empty to use simple colored circle. | "" <br> "\<FILENAME>.\<FILEXTENSION>" |
| ENABLE_EDIT | A boolean which decides whether or not to display the button which opens the path edit menu. False is recommended for the final release. | true <br> false |
| ENABLE_DYNAMIC_ANIMATION_SPEED | If enabled, the animation will progress slower the thinner a path is. | true <br> false |
| ANIMATION_SPEED | Sets the speed at which the animation progresses through a characters path. Set to -1 to use default speed. | \<any number> |
| CHARACTER_LIST | List of all displayable characters. <br> "NAME" indicates the name by which users will find the character on the website. <br> "FILE" marks the file containing the path data for that character. | \{ <br> &nbsp;&nbsp;&nbsp;&nbsp; "NAME": "\<Character Name>" <br> &nbsp;&nbsp;&nbsp;&nbsp;"FILE": "FILENAME.FILEEXTENSION" <br> } |
| LOD_MODE | LOD-Mode allows displaying a less detailed map when the scale is small to save resources. Use when experiencing lag while dragging and zooming the map (test weaker devices such as phones and Chrome). Use as few additional images as possible as this increases initial site load time and data usage for each additional image. Using too many images might even decrease performance. Set to "none" to disable LOD, "mobile" to activate it only on phones, "portable" to activate it on phones and tablets or "all" to activate LOD on all devices. | "none" <br> "mobile" <br> "portable" <br >"all" |
| MAP_IMAGE_LOD | The steps to be used for LOD. Entries must be ordered descending by scale. The image specified in "FILE" will be used when the current map scale gets smaller than the number in "SCALE". | \{ <br> &nbsp;&nbsp;&nbsp;&nbsp; "SCALE": \<any number> <br> &nbsp;&nbsp;&nbsp;&nbsp; "FILE": "\<FILENAME>.\<FILEXTENSION>" <br> } |
| SUB_MAPS | A list of images specified by the "FILE" attribute that will be rendered on top of the background map. The images's center will be positioned at (X,Y), where "X" and "Y" are coordinates within the background map's pixel grid. You can use the "Print Coords" button in the edit menu to get the coordinates of a specific point on your background map. "WIDTH" and "HEIGHT" set the maximum size of the image in pixels relative to the background map (the image's aspect ratio will be kept). | \{ <br> &nbsp;&nbsp;&nbsp;&nbsp; "X": \<any number> <br> &nbsp;&nbsp;&nbsp;&nbsp; "Y": \<any number> <br> &nbsp;&nbsp;&nbsp;&nbsp; "WIDTH": \<any number> <br> &nbsp;&nbsp;&nbsp;&nbsp; "HEIGHT": \<any number> <br> &nbsp;&nbsp;&nbsp;&nbsp; "FILE": "\<FILENAME>.\<FILEXTENSION>" <br> } |
| DISABLED_SHORTCUTS | A list of shortcuts that should be disabled. Refer to the "Shortcuts" section for the shortcut codes. | ["shortcut_code"]

**All images linked in config.json must be provided in the assets/user/ folder.**

#### Example:
```
{
  "MAP_IMAGE_FILE": "map.png",
  "INITIAL_ZOOM": 1,
  "MIN_ZOOM": 1,
  "MAX_ZOOM": 30,
  "LOGO_ICON_FILE": "logo.png",
  "LOGO_STRING": "Hello World!",
  "SLIDER_ICON_FILE": "slider.png",
  "ENABLE_EDIT": true,
  "CHARACTER_LIST": [
    {
      "NAME": "My Character",
      "FILE": "character-data.json"
    },
    {
      "NAME": "My other Character",
      "FILE": "other-character-data.json"
    }
  ],
  "LOD_MODE": "all",
  "MAP_IMAGE_LOD": [
    {
      "SCALE": 10,
      "FILE": "Map_Used_Between_Scales_10_and_1.png"
    },
    {
      "SCALE": 1,
      "FILE": "Map_LowerResolution_Used_Between_Scales_1_and_0.5.png"
    },
    {
      "SCALE": 0.5,
      "FILE": "Map_EvenLowerResolution_Used_Between_Scales_0.5_and_MIN_ZOOM.png"
    }
  ],
  "SUB_MAPS": [
    {
      "X": 100,
      "Y": 200,
      "WIDTH": 10,  
      "HEIGHT": 10,
      "FILE": "SubMapImage.png"
    },
    {
      "X": 200,
      "Y": 300,
      "WIDTH": 10,  
      "HEIGHT": 10,
      "FILE": "SubMapImage2.png"
    }
  ],
  "DISABLED_SHORTCUTS": ["toggle_editmenu", "toggle_sidemenu"]
}
```

### Additional settings

These settings are not required for the website to run but should be adjusted before release.

**Page title:** To change your website's title, open the `index.html` file and insert it between the `<title>` elements which can be found at the top of the file.

**Description:** To change the preview description of your website, open the `index.html` file and add it in the `content=""` field of the `<meta>` tag where `name="description"`.

**Keywords:** To change the search engine keywords, open the `index.html` file and add them in the `content=""` field of the `<meta>` tag where `name="keywords"`.

**Site Name:** To change the [Google Site Name](https://developers.google.com/search/docs/appearance/site-names), open the `index.html` file and enter your preferred name as the value for the `name` attribute in the `<script>` tag where `type="application/ld+json"`. You must also enter your canonical url as the value for the `url` attribute.

**Favicon:** To set your website's favicon, the small image displayed next to the title, choose a suitable image, open the `index.html` file and add the relative file path to your image in the `href=""` field of the `<link>` tag where `rel="icon"`.

**Colors:** To change the website's color layout, opening the `index.css` file and edit the values in the "Color scheme" section. Refer to [this site](https://www.w3schools.com/cssref/pr_text_color.php) to see the allowed formating options.  
Editing the variables in the `base` section maintains the default color layout. If you want to change a specific component's colors you'll need to find the associated variable in the `advanced` section. (Your browser's `Inspect element` feature can help you find the correct value to edit).

**Font:** If you want to use a custom font, go into the assets/system/ folder, delete the current font.ttf file, paste your font and rename it to "font.ttf".

**Credits:** The text in the credits.txt file in the data/ folder appears in the about section of the website. Edit it to you liking. The text can be formatted using [html syntax](https://editorhtmlonline.com).

## How to use the editor

### Editing paths
To edit an existing character or create a new one, open the sidemenu and select the edit button at the bottom of the menu. The menu you just opened is the editmenu. Here you can edit existing path data files by searching for a character using the search bar or create a new character by clicking on the "New Character" button. Since you don't have any characters yet, create a new one. 

You now see a menu which allows you filter which paths of your character should be displayed, the same menu your users will use. You select which books shall be displayed, or additionally filter by section or animate the path.

Create your first path using the "Create Path" button. On the map a path appears which you can drag to the desired position by dragging the red points. The dark point is the endpoint.  
You also now see the path editor UI in the editmenu. This allows you to further edit the selected path. The editor representing the current draggable path will be darker.

The path editor controls from right to left:
1) The drag button. Hold to drag and reorder the path.
2) The color picker. This sets the color for the paths stroke.
3) The stroke selector. This allows you to select which type of line to represent the path with.
4) The width input. This sets the width of the path's stroke.
5) The book input. Input a number representing the book this path belongs to.
6) The end-of-section-checkbox. The paths belonging to a character are devided into sections. All paths in a section share a tooltip, which is the text that appears when clicking a path while viewing it (outside edit mode). Checking this checkbox marks the path as the end of it's section. The following paths will be added to the next section.
7) The tooltip button. This opens the tooltip editing dialog where you can set the tooltip for that section's path.
8) The endpoint button. Paths that are marked as end-of-section will be drawn with a circle at their end point. Clicking this circle shows the endpoint tooltip which you can set using this button.
9) The delete button. This deletes the path.

Clicking any control on a path editor selects the connected path for dragging.  
Clicking any path on the map during edit mode selects it for dragging and highlights the connected path editor.

To save, click the save button to save your character into a json file which will automatically be downloaded. The "Save" button does not format the resulting json which decreases the filesize and is recommended for the final file. The "Save Pretty" button formats the json making it easier to edit entries by hand should that be required. Files can be freely converted from one mode to the other simply by loading and resaving them using the corresponding button.
  
The last button in the edit menu's button row is the "Print Coords" button. Clicking this button and then somewhere on the map prints the clicked position relative to the map and path SVG into the developer console.

**Note:** If you create a new path and it doesn't appear on the map, make sure the display controller is not limiting the displayed paths in a way that hides the new path.  
After dragging it may look like the strokes of two paths aren't connected cleanly. However, once the character is loaded using the user and not the edit menu, the paths' dashes will be offset such that transitions will be unnoticable *as long as the end and start points are snapped together*.

### Adding characters to the website

Once you have a json file containing path data, put it in the data/paths/ folder. Then head over to the config.json and put your filename and desired character name into the CHARACTER_LIST. Refer to the config section's example for help with the syntax.

## Shortcuts
| Shortcut | Code | Function |
| --- | --- | --- |
| CRTL+SHIFT+S | toggle_sidemenu | Toggles the side menu. |
| CRTL+SHIFT+E | toggle_editmenu | Toggles the edit menu. Works even when edit menu button is disabled. |

## Suggesting improvements
Mind the disclaimer at the top of this README.
If you end up using this website and have any ideas for new features, would like to see or improvements for existing features or discovered a bug, you can open a new issue in this repository and I will see what I can do to help you.  

## How to build
Clone the repository and install node.js and the required dependencies by running `npm install` in the directory.  
To build the project run `npm run build` in the command line.
The other build commands are:

- ``build``: Build for development.
- ``build-rc``: Build for development while overwriting local config with the config template file. Use this command after changes to the config template.
- ``build-clean``: Build for development while deleting all previous files in the dist/ folder.
- ``publish``: Build a release version.

To test changes you'll need to follow the guide on how to use the website while inserting some dummy data. All local file changes such as changes to config.json, adding images to assets/user/ or adding paths in the data/paths/ folder should be made in the src/ folder and will be copied when building the website.  
The only time you need to open the dist/ folder is when running the website. **You need to open the index.html file in the dist/ folder on your local server to run the built website!**
