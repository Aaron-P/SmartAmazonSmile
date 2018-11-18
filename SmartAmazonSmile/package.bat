@echo off
cd .\SmartAmazonSmile

rmdir /S /Q ..\Firefox
..\7za.exe a -tzip ..\Firefox\SmartAmazonSmile.zip ^
	..\..\LICENSE.md^
	..\..\README.md^
	background.js^
	icon.svg^
	manifest.json
