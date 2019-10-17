@echo off

rmdir /S /Q .\dist\Firefox
.\lib\7za.exe a -tzip .\dist\Firefox\SmartAmazonSmile.zip @package-firefox.txt
