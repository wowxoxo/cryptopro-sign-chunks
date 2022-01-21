var CADESCOM_CADES_BES = 1;
var CAPICOM_CURRENT_USER_STORE = 2;
var CAPICOM_MY_STORE = "My";
var CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;
var CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME = 1;
var CADESCOM_BASE64_TO_BINARY = 1;

// function signCreate(certSubjectName, oHashedData) {
async function signCreate(cert, oHashedData) {
    // var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
    // oStore.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE,
    //     CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);

    // var oCertificates = oStore.Certificates.Find(
    //     CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, certSubjectName);
    // if (oCertificates.Count == 0) {
    //     alert("Certificate not found: " + certSubjectName);
    //     return;
    // }
    // var oCertificate = oCertificates.Item(1);
    var oCertificate = cert;
    // var oSigner = cadesplugin.CreateObject("CAdESCOM.CPSigner");
    var oSigner = await cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
    oSigner.Certificate = oCertificate;
    oSigner.TSAAddress = "http://testca.cryptopro.ru/tsp/tsp.srf"

    // var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
    var oSignedData = await cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
    oSignedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;

    try {
        console.error("oHashedData", oHashedData);
        console.error("oSigner", oSigner);
        console.error("CADESCOM_CADES_BES", CADESCOM_CADES_BES);
        var sSignedMessage = await oSignedData.SignHash(oHashedData, oSigner, CADESCOM_CADES_BES);
    } catch (err) {
        alert("Failed to create signature. Error: " + cadesplugin.getLastError(err));
        return;
    }

    oStore.Close();

    return sSignedMessage;
}

async function Verify(sSignedMessage, oHashedData) {
    var oSignedData = await cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
    try {
        oSignedData.VerifyHash(oHashedData, sSignedMessage, CADESCOM_CADES_BES);
    } catch (err) {
        alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
        return false;
    }

    return true;
}

async function signFile(file, cert) {
    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    var chunkSize = 3 * 1024 * 1024; // 3MB
    var chunks = Math.ceil(file.size / chunkSize);
    var currentChunk = 0;

    console.log("CADESPLUGIN", cadesplugin);
    // var oHashedData = cadesplugin.CreateObject("CAdESCOM.HashedData");
    var oHashedData = await cadesplugin.CreateObjectAsync("CAdESCOM.HashedData");
    console.log('HASH', oHashedData);
    oHashedData.DataEncoding = CADESCOM_BASE64_TO_BINARY;

    // var progress = document.getElementById("progressbar").childNodes.item(1);
    var progress = document.getElementById("progressbar");

    var frOnload = async function(e) {
        var header = ";base64,";
        var sFileData = e.target.result;
        var sBase64Data = sFileData.substr(sFileData.indexOf(header) + header.length);

        oHashedData.Hash(sBase64Data);

        var percentLoaded = Math.round((currentChunk / chunks) * 100);
        // Increase the progress bar length.
        if (percentLoaded <= 100) {
            // progress.style.width = percentLoaded + '%';
            console.log('PERCENT', percentLoaded);
            progress.value = percentLoaded;
            // progress.textContent = percentLoaded + '%';
        }

        currentChunk++;

        if (currentChunk < chunks) {
            loadNext();
        }
        else {
            document.getElementById("progressbar").style.visibility = "hidden";
            var signedMessage = await signCreate(cert, oHashedData);
            // Выводим отделенную подпись в BASE64 на страницу
            // Такая подпись должна проверяться в КриптоАРМ и cryptcp.exe
            // document.getElementById("signature").innerHTML = signedMessage;
            console.log('SIGNED MESSAGE', signedMessage);

            // Проверим подпись
            var verifyResult = await Verify(signedMessage, oHashedData);
            if (verifyResult) {
                alert("Signature verified");
            }
        }
    };

    var frOnerror = function() {
        alert("File load error.");
    };

    async function loadNext() {
        var fileReader = new FileReader();
        fileReader.onload = await frOnload;
        fileReader.onerror = frOnerror;

        var start = currentChunk * chunkSize,
        end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

        fileReader.readAsDataURL(blobSlice.call(file, start, end));
    };

    await loadNext();
}

function doCheck() {
    // Проверяем, работает ли File API
    if (window.FileReader) {
        // Браузер поддерживает File API.
    } else {
        alert("The File APIs are not fully supported in this browser.");
    }
    var fileReader = new FileReader();
    if (typeof(fileReader.readAsDataURL)!="function") {
        alert("Method readAsDataURL() is not supported in FileReader.");
        return;
    }
}

function doSign(id) {
    // Проверяем, работает ли File API
    doCheck();
    if (1 != document.getElementById("openFileButton").files.length) {
        alert("Select the file.");
        return;
    }

    var oFile = document.getElementById("openFileButton").files[0];

    var e = document.getElementById(id);
    var selectedCertID = e.selectedIndex;
    // var selectedCert = e.options[selectedCertID];
    if (selectedCertID == -1) {
        alert("Select certificate");
        return;
    }
    var certificate = global_selectbox_container[selectedCertID];
    console.log('CERT', certificate);

    // old
    // var oCertName = document.getElementById("CertName");
    // var sCertName = oCertName.value; // Здесь следует заполнить SubjectName сертификата
    // if ("" == sCertName) {
    //     alert("Введите имя сертификата (CN).");
    //     return;
    // }
    // signFile(oFile, sCertName);
    signFile(oFile, certificate);
}