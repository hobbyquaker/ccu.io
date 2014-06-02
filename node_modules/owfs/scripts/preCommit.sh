#!/bin/sh
git stash -q --keep-index
grunt
git stash pop -q