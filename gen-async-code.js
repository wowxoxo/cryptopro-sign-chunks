var CADESCOM_CADES_BES = 1;
var CAPICOM_CURRENT_USER_STORE = 2;
var CAPICOM_MY_STORE = "My";
var CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;
var CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME = 1;
var CADESCOM_BASE64_TO_BINARY = 1;

// function signCreate(certSubjectName, oHashedData) {
function signCreate(cert, oHashedData) {
    cadesplugin.async_spawn(function*(arg) {
        var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
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
        var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
        oSigner.Certificate = oCertificate;

        var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
        oSignedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;

        try {
            var sSignedMessage = oSignedData.SignHash(oHashedData, oSigner, CADESCOM_CADES_BES);
        } catch (err) {
            alert("Failed to create signature. Error: " + cadesplugin.getLastError(err));
            return;
        }

        oStore.Close();

        return sSignedMessage;
    })
}

function Verify(sSignedMessage, oHashedData) {
    cadesplugin.async_spawn(function*(arg) {
        var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
        // try {
        //     oSignedData.VerifyHash(oHashedData, sSignedMessage, CADESCOM_CADES_BES);
        // } catch (err) {
        //     alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
        //     return false;
        // }

        return true;
    })    
}

function signFile(file, cert) {
    cadesplugin.async_spawn(function*(arg) {
        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
        var chunkSize = 3 * 1024 * 1024; // 3MB
        var chunks = Math.ceil(file.size / chunkSize);
        var currentChunk = 0;

        console.log('cadesplugin', cadesplugin);
        var oHashedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.HashedData");
        // var oHashedData = cadesplugin.CreateObjectAsync("CAdESCOM.HashedData");
        oHashedData.DataEncoding = CADESCOM_BASE64_TO_BINARY;

        // var progress = document.getElementById("progressbar").childNodes.item(1);
        var progress = document.getElementById("progressbar");

        var frOnload = function(e) {
            cadesplugin.async_spawn(function*(arg) {
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
                    var signedMessage = yield signCreate(cert, oHashedData);
                    // Выводим отделенную подпись в BASE64 на страницу
                    // Такая подпись должна проверяться в КриптоАРМ и cryptcp.exe
                    // document.getElementById("signature").innerHTML = signedMessage;
                    console.log('signedMessage', signedMessage);

                    // Проверим подпись
                    var verifyResult = yield Verify(signedMessage, oHashedData);
                    if (verifyResult) {
                        alert("Signature verified");
                    }
                }
            })
            
        };

        var frOnerror = function() {
            alert("File load error.");
        };

        function loadNext() {
            var fileReader = new FileReader();
            fileReader.onload = frOnload;
            fileReader.onerror = frOnerror;

            var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

            fileReader.readAsDataURL(blobSlice.call(file, start, end));
        };

        loadNext();
    })
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