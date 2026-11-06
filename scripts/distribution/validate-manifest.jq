def exact($names): type == "object" and ((keys | sort) == ($names | sort));
def positive: type == "number" and . > 0 and . == floor and . <= 68719476736;
def sha: type == "string" and test("^[a-f0-9]{64}$");
def image($name; $release):
  exact(["tag","imageId","sizeBytes"]) and
  .tag == ("appb2t-" + $name + ":" + $release) and
  (.tag | split(":")[1] | length <= 128) and
  (.imageId | type == "string" and test("^sha256:[a-f0-9]{64}$")) and
  (.sizeBytes | positive);
. as $m |
exact(["schemaVersion","release","appVersion","sourceRepository","sourceCommit","platform","baseReference","images","files"]) and
.schemaVersion == 1 and
(.appVersion | type == "string" and test("^[0-9]+\\.[0-9]+\\.[0-9]+$")) and
.sourceRepository == "bsgirardi/appb2t" and
(.sourceCommit | type == "string" and test("^[a-f0-9]{40}$")) and
(.platform == "linux/amd64" or .platform == "linux/arm64") and
(.baseReference | type == "string" and test("^node:22-bookworm-slim@sha256:[a-f0-9]{64}$")) and
(.release | type == "string" and startswith("app-v" + $m.appVersion + "-" + $m.sourceCommit[0:12] + "-")) and
(.release | ltrimstr("app-v" + $m.appVersion + "-" + $m.sourceCommit[0:12] + "-") | test("^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$")) and
(.images | exact(["app","tools"])) and
(.images.app | image("app"; $m.release)) and (.images.tools | image("tools"; $m.release)) and
(.files | type == "array" and length == 2) and
([.files[].name] | sort == ["compose.production.yaml","images.tar.gz"]) and
all(.files[]; exact(["name","sizeBytes","sha256"]) and (.sha256 | sha) and (.sizeBytes | positive and . < 2147483648))
