import urllib.request
import ssl
import os

os.makedirs('public', exist_ok=True)

# Bypass SSL verification
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

print("Downloading httplib.h...")
with urllib.request.urlopen("https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h", context=ctx) as u, open("httplib.h", 'wb') as f:
    f.write(u.read())

print("Downloading json.hpp...")
with urllib.request.urlopen("https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp", context=ctx) as u, open("json.hpp", 'wb') as f:
    f.write(u.read())

print("Done.")
