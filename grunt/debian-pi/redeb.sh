#!/usr/bin/env bash

# IMPORTANT 
# Protect agaisnt mispelling a var and rm -rf /
set -u
set -e

rm -rf dest
mkdir -p dest
rm -f *.deb

#rm -rf ${SRC}
#rsync -a deb-src/ ${SRC}/
#mkdir -p ${SYSROOT}/opt/

#rsync -a ../HelloNode/ ${SYSROOT}/opt/ccu.io/ --delete

find sysroot/ -type d -exec chmod 0755 {} \;
find sysroot/ -type f -exec chmod go-w {} \;
chown -R root:root sysroot/
find DEBIAN/ -type d -exec chmod 0755 {} \;
find DEBIAN/ -type f -exec chmod go-w {} \;
chown -R root:root DEBIAN/

#let SIZE=`du -s ${SYSROOT} | sed s'/\s\+.*//'`+8
cd sysroot
echo tar czf ../dest/data.tar.gz [a-z]*
tar czf ../dest/data.tar.gz [a-z]*
cd ..
#sed s"/SIZE/${SIZE}/" -i ${DEBIAN}/control
#cd DEBIAN
#tar czf ../dest/control.tar.gz *
#cd ..
cp control.tar.gz dest/

cd dest
echo 2.0 > ./debian-binary

find ./ -type d -exec chmod 0755 {} \;
find ./ -type f -exec chmod go-w {} \;
chown -R root:root ./
ar r ../ccu.io-pi.2.0.1.deb debian-binary control.tar.gz data.tar.gz
cd ..
#rsync -a ${DIST}/hellonode-1.deb ./
