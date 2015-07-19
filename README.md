# pass-chrome

A chrome browser extension for [pass](http://www.passwordstore.org/)

This is very much a work in progress, expect a better README, installation
instructions and maybe even a Chrome Store entry soon.

![Screen Shot](/screenshot.jpg?raw=true "Pass Chrome")

## Requirements

* Pass is installed and initialized, available to system as `pass` command
* `pwgen` installed, a requirement of Pass so should be fine
* Python. This extension uses native messaging, a python script wraps the
communication

## Installation (Development mode)

* Checkout or download and extract this project
* In Chrome/Chromium go to More Tools > Extensions
* Drag and drop `app.crx` onto the page
* Finally, to enable the native client support run
 
```
./install.sh
```

or for Chromium

```
./install.sh chromium
```
