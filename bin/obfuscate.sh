#!/bin/bash

$(npm bin)/obfuscator --no-color --strings --out alert-service.js --entry index.js index.js
