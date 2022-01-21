var isPluginEnabled = false;
var fileContent; // Переменная для хранения информации из файла, значение присваивается в cades_bes_file.html
var global_selectbox_container = new Array();
var global_isFromCont = new Array();
var global_selectbox_counter = 0;
function getXmlHttp() {
    var xmlhttp;
    try {
        xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (E) {
            xmlhttp = false;
        }
    }
    if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
        xmlhttp = new XMLHttpRequest();
    }
    return xmlhttp;
}

function CertStatusEmoji(isValid, hasPrivateKey) {
    if (isValid) {
        _emoji = "\u2705";
    } else {
        _emoji = "\u274C";
    }
    //if (hasPrivateKey) {
    //    _emoji += "\uD83D\uDD11";
    //} else {
    //    _emoji += String.fromCodePoint(0x1F6AB);
    //}
    return _emoji;
}
var async_code_included = 0;
var async_Promise;
var async_resolve;
function include_async_code() {
    if (async_code_included) {
        return async_Promise;
    }
    var fileref = document.createElement('script');
    fileref.setAttribute("type", "text/javascript");
    fileref.setAttribute("src", "async_code.js");
    document.getElementsByTagName("head")[0].appendChild(fileref);
    async_Promise = new Promise(function (resolve, reject) {
        async_resolve = resolve;
    });
    async_code_included = 1;
    return async_Promise;
}

function isIE() {
    var retVal = (("Microsoft Internet Explorer" == navigator.appName) || // IE < 11
        navigator.userAgent.match(/Trident\/./i)); // IE 11
    return retVal;
}

function isEdge() {
    var retVal = navigator.userAgent.match(/Edge\/./i);
    return retVal;
}

function Common_CheckForPlugIn() {
    cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_DEBUG);
    var canAsync = !!cadesplugin.CreateObjectAsync;
    if (canAsync) {
        include_async_code().then(function () {
            return CheckForPlugIn_Async();
        });
    } else {
        return CheckForPlugIn_NPAPI();
    }
}

function signFileInChunks(id) {
    window.startTime = performance.now();
    console.log('start measure');
    document.getElementById("crypro_progress").innerHTML = "Please wait, operation in progress...";
    // return doSign(id);
    // doSign(id);
    run();
}

var CADESCOM_CADES_BES = 1;
var CAPICOM_CURRENT_USER_STORE = 2;
var CAPICOM_MY_STORE = "My";
var CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;
var CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME = 1;
var CADESCOM_BASE64_TO_BINARY = 1;

function doCheck() {
    // Проверяем, работает ли File API
    if (window.FileReader) {
        // Браузер поддерживает File API.
    } else {
        alert("The File APIs are not fully supported in this browser.");
    }
    var fileReader = new FileReader();
    if (typeof (fileReader.readAsDataURL) !== "function") {
        alert("Method readAsDataURL() is not supported in FileReader.");
        return;
    }
}

function run() {
    cadesplugin.async_spawn(function* (args) {
        // Проверяем, работает ли File API
        doCheck();

        if (1 != document.getElementById("openFileButton").files.length) {
            alert("Select the file.");
            return;
        }
    
        var oFile = document.getElementById("openFileButton").files[0];
        // var oCertName = document.getElementById("CertName");
        // var sCertName = oCertName.value; // Здесь следует заполнить SubjectName сертификата
        // if ("" === sCertName) {
        //     alert("Введите имя сертификата (CN).");
        //     return;
        // }
        var e = document.getElementById('CertListBox');
        var selectedCertID = e.selectedIndex;
        // var selectedCert = e.options[selectedCertID];
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }
        var certificate = global_selectbox_container[selectedCertID];
        var sCertName = "Test Certificate"


        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
        var chunkSize = 3 * 1024 * 1024; // 3MB
        var chunks = Math.ceil(oFile.size / chunkSize);
        var currentChunk = 0;

        var oHashedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.HashedData");
        yield oHashedData.propset_DataEncoding(CADESCOM_BASE64_TO_BINARY);

        var progress = document.getElementById("progressbar");

        var frOnload = function (e) {
            var header = ";base64,";
            var sFileData = e.target.result;
            var sBase64Data = sFileData.substr(sFileData.indexOf(header) + header.length);

            oHashedData.Hash(sBase64Data);

            var percentLoaded = Math.round((currentChunk / chunks) * 100);
            // Increase the progress bar length.
            if (percentLoaded <= 100) {
                progress.value = percentLoaded;
            }

            currentChunk++;

            if (currentChunk < chunks) {
                loadNext();
            }
            else {
                cadesplugin.async_spawn(function* (args) {
                    progress.value = 100;
                    var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
                    yield oStore.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE,
                        CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);

                    var oStoreCerts = yield oStore.Certificates;
                    var oCertificates = yield oStoreCerts.Find(
                        CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, sCertName);
                    var certsCount = yield oCertificates.Count;
                    if (certsCount === 0) {
                        alert("Certificate not found: " + sCertName);
                        return;
                    }
                    var oCertificate = yield oCertificates.Item(1);
                    console.error("oCertificate", oCertificate);
                    var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                    yield oSigner.propset_Certificate(oCertificate);
                    yield oSigner.propset_CheckCertificate(true);

                    var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                    oSignedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);

                    try {
                        var sSignedMessage = yield oSignedData.SignHash(oHashedData, oSigner, CADESCOM_CADES_BES);
                    } catch (err) {
                        alert("Failed to create signature. Error: " + cadesplugin.getLastError(err));
                        return;
                    }
                    yield oStore.Close();

                    // Выводим отделенную подпись в BASE64 на страницу
                    // Такая подпись должна проверяться в КриптоАРМ и cryptcp.exe
                    // document.getElementById("signature").innerHTML = sSignedMessage;
                    console.log('SIGNED MESSAGE', sSignedMessage);

                    // Проверим подпись
                    var oSignedData2 = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                    try {
                        yield oSignedData2.VerifyHash(oHashedData, sSignedMessage, CADESCOM_CADES_BES);
                        alert("Signature verified");
                    } catch (err) {
                        alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
                        return;
                    }
                });
            }
        };

        var frOnerror = function () {
            alert("File load error.");
        };

        function loadNext() {
            var fileReader = new FileReader();
            fileReader.onload = frOnload;
            fileReader.onerror = frOnerror;

            var start = currentChunk * chunkSize,
                end = ((start + chunkSize) >= oFile.size) ? oFile.size : start + chunkSize;

            fileReader.readAsDataURL(blobSlice.call(oFile, start, end));
        };

        loadNext();
    });
}