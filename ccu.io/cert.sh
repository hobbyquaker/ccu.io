#!/bin/bash
mkdir cert
openssl genrsa -out cert/privatekey.pem 1024 
openssl req -new -key cert/privatekey.pem -out cert/certrequest.csr 
openssl x509 -req -in cert/certrequest.csr -signkey cert/privatekey.pem -out cert/certificate.pem