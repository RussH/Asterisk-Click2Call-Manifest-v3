# Asterisk Click2Call (Manifest V3)

This is a Manifest V3 version of a basic Asterisk Click2Call extension. It’s based on the basic sections of the Bitree Click2Call extension which demonstrated how to build a proper URL for Asterisk using AMI (Asterisk v12 or higher). No tracking embedded in this one!

## Overview

This extension allows you to click on a highlighted phone number on a webpage and have Asterisk place a call via a callback mechanism. The extension constructs a URL based on settings saved in Chrome Storage, and the URL follows the format required by Asterisk’s ARI interface.

## Click2Call Callback URL Format

The extension builds the following URL format to initiate a call:

```bash
curl -v -X POST "http://192.168.0.1:8088/ari/channels?endpoint=Local/999@all&extension=01234567890&callerId=01234567890&timeout=15&context=all&api_key=click2call:click2call_secret"
```
## URL Parameters Explained

- **endpoint:** `Local/999@all`  
  The local channel for the outbound call. Replace `999` with your extension.
- **extension:**  
  The phone number to dial (e.g., `01234567890`).
- **callerId:**  
  The number that will be displayed as the caller ID.
- **timeout:**  
  The call timeout in seconds.
- **context:**  
  The dialplan context (e.g., `all`).
- **api_key:**  
  The manager username and secret combined (e.g., `click2call:click2call_secret`).

## Asterisk Configuration

For this extension to work, update your Asterisk configuration as follows:

1. **Asterisk Version**  
   Ensure you are using **Asterisk version 12 or higher** with AMI support.

2. **Manager Configuration**  
   Add the following entry to your `/etc/asterisk/manager.conf`:

   ```ini
   [clicktocall]
   secret=clicktocall_secret
   writetimeout=100
   read=system,call,log,verbose,command,agent,user,config,originate
   write=system,call,log,verbose,command,agent,user,config,originate
   
   ```

   ### 3. Enable Mini HTTP Server

Enable the mini HTTP server in Asterisk by updating your `http.conf` with the following settings:

```ini
 [general]
 enabled=yes
 bindaddr=192.168.0.1
 bindport=8088
 uploads=/var/lib/asterisk/uploads/blah/
  ```

## Installation

1. **Clone or Download the Repository**  
   Clone the repository or download the source code to your local machine.

2. **Load the Extension into Chrome**  
   - For development, open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" by toggling the switch in the top-right corner.
   - Click on "Load unpacked" and select your extension’s folder.
   - Alternatively, you can package the extension and submit it to the Chrome Web Store.

3. **Configure the Extension Options**  
   - Open the extension’s options page (usually accessible via the extension icon or through `chrome://extensions/`).
   - Enter your Asterisk settings (IP, extension, username, secret, context, etc.) as required.
   - Click "Save" to store your configuration.

4. **Test the Extension**  
   - Visit any webpage, highlight a phone number, right-click, and choose the context menu option to initiate a call.
   - Verify that the call is placed as expected.


