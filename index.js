let crypto = require("crypto");
let COS = require("cos-nodejs-sdk-v5");

function getFileName(req, file, callback) {
    let ext = file.originalname.split(".").pop();
    crypto.pseudoRandomBytes(16, function (err, raw) {
        callback(err, err ? undefined : raw.toString("hex") + "." + ext);
    });
}
function QCloudCos(options = {}) {
    if (!(this instanceof QCloudCos)) {
        return new QCloudCos(options);
    }
    if (options.filename === "auto" || !options.filename) {
        this.getFileName = getFileName;
    } else {
        this.getFileName = options.filename;
    }
    if (options.cos) {
        options.cos.SecretId = options.cos.SecretId || process.env.SecretId || null;
        options.cos.SecretKey = options.cos.SecretKey || process.env.SecretKey || null;
        options.cos.Bucket = options.cos.Bucket || process.env.Bucket || null;
        options.cos.Region = options.cos.Region || process.env.Region || null;
        options.cos.domain = options.cos.domain || process.env.domain || null;
        options.cos.domainProtocol = options.cos.domainProtocol || process.env.domainProtocol || null;
        options.cos.dir = options.cos.dir || process.env.dir || "";
        //Verify the COS configuration parameters
        if (!options.cos.SecretId) {
            throw new Error("QCloud Cos SecretId is null.");
        }
        if (!options.cos.SecretKey) {
            throw new Error("QCloud Cos SecretKey is null.");
        }
        if(!options.cos.dir===''){
          options.cos.dir = options.cos.dir + "/";
        }
        //cos runing instance
        this.cos = new COS({
            // Required parameters
            SecretId: options.cos.SecretId,
            SecretKey: options.cos.SecretKey,
            // Optional parameters
            FileParallelLimit: 3,
        });
        //cos configuration at runtime
        this.cosRun = {
          Bucket: options.cos.Bucket,
          Region: options.cos.Region,
          dir: options.cos.dir,
          taskId: null,
          domain: options.cos.domain,
          domainProtocol: options.cos.domainProtocol,
          onProgress: options.cos.onProgress || function () {},
        };
    } else {
        throw new Error("The COS parameter is not configured!");
    }
}
QCloudCos.prototype._handleFile = function _handleFile(req, file, callback) {
    let that = this;
    that.getFileName(req, file, function (err, filename) {
        if (err) {
            return callback(err);
        }
        file.filename = that.cosRun.dir + filename;
        const stream = file.stream;
        // put object after 'end' event emit to ensure multer 'readFinished'
        stream.on("end", () => {
            const buffer = Buffer.concat(chunks)
            that.cos.putObject({
                    Bucket: that.cosRun.Bucket,
                    Region: that.cosRun.Region,
                    Key: file.filename,
                    onProgress: function (progressData) {
                        that.cosRun.onProgress(progressData);
                    },
                    Body: buffer,
                },
                function (err, data) {
                    if (err) {
                        that._removeFile(req, file, function () {
                            return callback(err.error);
                        });
                    } else {
                        let url = data.Location;
                        const protocol = that.cosRun.domainProtocol || "https";
                        url = `${protocol}://${url}`;
                        if (that.cosRun.domain) {
                            url = url.replace(
                                /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/,
                                that.cosRun.domain
                            );
                        }
                        file.url = url;
                        callback();
                    }
                }
            );
        });
        const chunks = [];
        stream.on("readable", () => {
            let chunk;
            while (null !== (chunk = stream.read())) {
                chunks.push(chunk);
            }
        });
    });
};
QCloudCos.prototype._removeFile = function _removeFile(req, file, callback) {
    let that = this;
    if (!this.cos) {
        console.error("qcloud cos client undefined");
        return callback({
            message: "qcloud cos client undefined"
        });
    }
    // An error occurred and the uploaded file was rolled back
    this.cos.deleteObject({
            Bucket: that.cosRun.Bucket,
            Region: that.cosRun.Region,
            Key: file.filename,
        },
        function (err, data) {
            if (err) {
                console.log(`rollback failed:${err.error}`);
                return callback(err.error);
            } else {
                console.log("rollback success,please check the configuration");
                return callback(null, data);
            }
        }
    );
};
module.exports =(options)=>{
    return new QCloudCos(options);
};