function CertificateAdjuster()
{
}
CertificateAdjuster.prototype.checkQuotes = function(str)
{
    var result = 0, i = 0;
    for(i;i<str.length;i++)if(str[i]==='"')
        result++;
    return !(result%2);
}

CertificateAdjuster.prototype.extract = function(from, what)
{
    certName = "";

    var begin = from.indexOf(what);

    if(begin>=0)
    {
        var end = from.indexOf(', ', begin);
        while(end > 0) {
            if (this.checkQuotes(from.substr(begin, end-begin)))
                break;
            end = from.indexOf(', ', end + 1);
        }
        certName = (end < 0) ? from.substr(begin) : from.substr(begin, end - begin);
    }

    return certName;
}

CertificateAdjuster.prototype.Print2Digit = function(digit)
{
    return (digit<10) ? "0"+digit : digit;
}

CertificateAdjuster.prototype.GetCertDate = function(paramDate)
{
    var certDate = new Date(paramDate);
    return this.Print2Digit(certDate.getUTCDate())+"."+this.Print2Digit(certDate.getUTCMonth()+1)+"."+certDate.getFullYear() + " " +
             this.Print2Digit(certDate.getUTCHours()) + ":" + this.Print2Digit(certDate.getUTCMinutes()) + ":" + this.Print2Digit(certDate.getUTCSeconds());
}

CertificateAdjuster.prototype.GetCertName = function(certSubjectName)
{
    return this.extract(certSubjectName, 'CN=');
}

CertificateAdjuster.prototype.GetIssuer = function(certIssuerName)
{
    return this.extract(certIssuerName, 'CN=');
}

CertificateAdjuster.prototype.GetCertInfoString = function(certSubjectName, certFromDate)
{
    return this.extract(certSubjectName,'CN=') + "; Выдан: " + this.GetCertDate(certFromDate);
}

function CheckForPlugIn_Async() {
    function VersionCompare_Async(StringVersion, ObjectVersion)
    {
        if(typeof(ObjectVersion) == "string")
            return -1;
        var arr = StringVersion.split('.');
        var isActualVersion = true;

        cadesplugin.async_spawn(function *() {
            if((yield ObjectVersion.MajorVersion) == parseInt(arr[0]))
            {
                if((yield ObjectVersion.MinorVersion) == parseInt(arr[1]))
                {
                    if((yield ObjectVersion.BuildVersion) == parseInt(arr[2]))
                    {
                        isActualVersion = true;
                    }
                    else if((yield ObjectVersion.BuildVersion) < parseInt(arr[2]))
                    {
                        isActualVersion = false;
                    }
                }else if((yield ObjectVersion.MinorVersion) < parseInt(arr[1]))
                {
                    isActualVersion = false;
                }
            }else if((yield ObjectVersion.MajorVersion) < parseInt(arr[0]))
            {
                isActualVersion = false;
            }

            if(!isActualVersion)
            {
                document.getElementById('PluginEnabledImg').setAttribute("src", "Img/yellow_dot.png");
                document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен, но есть более свежая версия.";
            }
            document.getElementById('PlugInVersionTxt').innerHTML = "Версия плагина: " + (yield CurrentPluginVersion.toString());
            var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
            var ver = yield oAbout.CSPVersion("", 80);
            var ret = (yield ver.MajorVersion) + "." + (yield ver.MinorVersion) + "." + (yield ver.BuildVersion);
            document.getElementById('CSPVersionTxt').innerHTML = "Версия криптопровайдера: " + ret;

            try
            {
                var sCSPName = yield oAbout.CSPName(80);
                document.getElementById('CspEnabledImg').setAttribute("src", "Img/green_dot.png");
                document.getElementById('CspEnabledTxt').innerHTML = "Криптопровайдер загружен";
                document.getElementById('CSPNameTxt').innerHTML = "Криптопровайдер: " + sCSPName;
            }
            catch(err){}
            return;
        });
    }

    function GetLatestVersion_Async(CurrentPluginVersion) {
        var xmlhttp = getXmlHttp();
        xmlhttp.open("GET", "/cades/latest_2_0.txt", true);
        xmlhttp.onreadystatechange = function() {
        var PluginBaseVersion;
            if (xmlhttp.readyState == 4) {
                if(xmlhttp.status == 200) {
                    PluginBaseVersion = xmlhttp.responseText;
                    VersionCompare_Async(PluginBaseVersion, CurrentPluginVersion)
                }
            }
        }
        xmlhttp.send(null);
    }


    window.onload = function (e) {
        document.getElementById('PluginEnabledImg').setAttribute("src", "Img/green_dot.png");
        document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен";
        document.getElementById('CspEnabledImg').setAttribute("src", "Img/yellow_dot.png");
        document.getElementById('CspEnabledTxt').innerHTML = "КриптоПро CSP не загружен";
    }
    document.getElementById('PluginEnabledImg').setAttribute("src", "Img/green_dot.png");
    document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен";
    document.getElementById('CspEnabledImg').setAttribute("src", "Img/yellow_dot.png");
    document.getElementById('CspEnabledTxt').innerHTML = "КриптоПро CSP не загружен";
    var CurrentPluginVersion;
    cadesplugin.async_spawn(function *() {
        var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
        CurrentPluginVersion = yield oAbout.PluginVersion;
        GetLatestVersion_Async(CurrentPluginVersion);
        if(location.pathname.indexOf("symalgo_sample.html")>=0){
            FillCertList_Async('CertListBox1');
            FillCertList_Async('CertListBox2');
        }else {
            FillCertList_Async('CertListBox');
        }
        // var txtDataToSign = "Hello World";
        // document.getElementById("DataToSignTxtBox").innerHTML = txtDataToSign;
        // document.getElementById("SignatureTxtBox").innerHTML = "";
    }); //cadesplugin.async_spawn
}

function onCertificateSelected(event) {
    console.log('event', event);
    cadesplugin.async_spawn(function *(args) {
        var selectedCertID = args[0][args[0].selectedIndex].value;
        var certificate = global_selectbox_container[selectedCertID];
        // FillCertInfo_Async(certificate, event.target.boxId, global_isFromCont[selectedCertID]);
        console.log('certificate', certificate);
    }, event.target);//cadesplugin.async_spawn
}

function FillCertList_Async(lstId) {
    cadesplugin.async_spawn(function *() {
        var MyStoreExists = true;
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            if (!oStore) {
                alert("Create store failed");
                return;
            }

            yield oStore.Open();
        }
        catch (ex) {
            MyStoreExists = false;
        }

        var lst = document.getElementById(lstId);
        if(!lst)
        {
            return;
        }
        lst.onchange = onCertificateSelected;
        lst.boxId = lstId;

        var certCnt;
        var certs;
        if (MyStoreExists) {
            try {
                certs = yield oStore.Certificates;
                certCnt = yield certs.Count;
            }
            catch (ex) {
                alert("Ошибка при получении Certificates или Count: " + cadesplugin.getLastError(ex));
                return;
            }
            for (var i = 1; i <= certCnt; i++) {
                var cert;
                try {
                    cert = yield certs.Item(i);
                }
                catch (ex) {
                    alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                    return;
                }

                var oOpt = document.createElement("OPTION");
                var dateObj = new Date();
                try {
                    var ValidFromDate = new Date((yield cert.ValidFromDate));
                    var ValidToDate = new Date(yield cert.ValidToDate);
                    var IsValid = ValidToDate > Date.now();
                    var emoji = CertStatusEmoji(IsValid);
                    oOpt.text = emoji + new CertificateAdjuster().GetCertInfoString(yield cert.SubjectName, ValidFromDate);
                }
                catch (ex) {
                    alert("Ошибка при получении свойства SubjectName: " + cadesplugin.getLastError(ex));
                }
                try {
                    //oOpt.value = yield cert.Thumbprint;
                    oOpt.value = global_selectbox_counter;
                    global_selectbox_container.push(cert);
                    global_isFromCont.push(false);
                    global_selectbox_counter++;
                }
                catch (ex) {
                    alert("Ошибка при получении свойства Thumbprint: " + cadesplugin.getLastError(ex));
                }

                lst.options.add(oOpt);
            }

            yield oStore.Close();
        }

        //В версии плагина 2.0.13292+ есть возможность получить сертификаты из 
        //закрытых ключей и не установленных в хранилище
        try {
            yield oStore.Open(cadesplugin.CADESCOM_CONTAINER_STORE);
            certs = yield oStore.Certificates;
            certCnt = yield certs.Count;
            for (var i = 1; i <= certCnt; i++) {
                var cert = yield certs.Item(i);
                //Проверяем не добавляли ли мы такой сертификат уже?
                var found = false;
                for (var j = 0; j < global_selectbox_container.length; j++)
                {
                    if ((yield global_selectbox_container[j].Thumbprint) === (yield cert.Thumbprint))
                    {
                        found = true;
                        break;
                    }
                }
                if(found)
                    continue;
                var oOpt = document.createElement("OPTION");
                var ValidFromDate = new Date((yield cert.ValidFromDate));
                var ValidToDate = new Date(yield cert.ValidToDate);
                var IsValid = ValidToDate > Date.now();
                var emoji = CertStatusEmoji(IsValid);
                oOpt.text = emoji + new CertificateAdjuster().GetCertInfoString(yield cert.SubjectName, ValidFromDate);
                oOpt.value = global_selectbox_counter;
                global_selectbox_container.push(cert);
                global_isFromCont.push(true);
                global_selectbox_counter++;
                lst.options.add(oOpt);
            }
            yield oStore.Close();

        }
        catch (ex) {
        }
        if(global_selectbox_container.length == 0) {
            document.getElementById("boxdiv").style.display = '';
        }
    });//cadesplugin.async_spawn
}

function CreateSimpleSign_Async() {
    cadesplugin.async_spawn(function*(arg) {
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Certificate not found');
            return;
        }
        var all_certs = yield oStore.Certificates;

        if ((yield all_certs.Count) == 0) {
            document.getElementById("boxdiv").style.display = '';
            return;
        }

        var cert;
        var found = 0;
        for (var i = 1; i <= (yield all_certs.Count); i++) {
            try {
                cert = yield all_certs.Item(i);
            }
            catch (ex) {
                alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                return;
            }

            var dateObj = new Date();
            try {
                var certDate = new Date((yield cert.ValidToDate));
                var Validator = yield cert.IsValid();
                var IsValid = yield Validator.Result;
                if(dateObj< certDate && (yield cert.HasPrivateKey()) && IsValid) {
                    found = 1;
                    break;
                }
                else {
                    continue;
                }
            }
            catch (ex) {
                alert("Ошибка при получении свойства SubjectName: " + cadesplugin.getLastError(ex));
            }
        }

        if (found == 0) {
            document.getElementById("boxdiv").style.display = '';
            return;
        }

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(cert);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(cert);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADES_BES = 1;

            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_Content(dataToSign);
            }
            yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
            try {
                Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
            }
            catch (err) {
                errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                throw errormes;
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }); //cadesplugin.async_spawn
}


function SignCadesBES_Async(certListBoxId, data, setDisplayData) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var certificate = global_selectbox_container[selectedCertID];

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        if(typeof(data) != 'undefined')
        {
            dataToSign = Base64.encode(data);
        }else {
            dataToSign = Base64.encode(dataToSign);
        }
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            //FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");

            yield oSigningTimeAttr.propset_Name(cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
            var oTimeNow = new Date();
            yield oSigningTimeAttr.propset_Value(oTimeNow);
            var attr = yield oSigner.AuthenticatedAttributes2;
            yield attr.Add(oSigningTimeAttr);


            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oDocumentNameAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
            yield oDocumentNameAttr.propset_Value("Document Name");
            yield attr.Add(oDocumentNameAttr);

            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY); //
                yield oSignedData.propset_Content(dataToSign);
            }
            yield oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);
            if (typeof (setDisplayData) != 'undefined') {
                //Set display data flag flag for devices like Rutoken PinPad
                yield oSignedData.propset_DisplayData(1);
            }

            try {
                Signature = yield oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_BES);
            }
            catch (err) {
                errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                throw errormes;
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
}

function SignCadesBES_Async_File(certListBoxId) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }
        var certificate = global_selectbox_container[selectedCertID];
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            //FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");

            var CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME = 0;
            yield oSigningTimeAttr.propset_Name(CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
            var oTimeNow = new Date();
            yield oSigningTimeAttr.propset_Value(oTimeNow);
            var attr = yield oSigner.AuthenticatedAttributes2;
            yield attr.Add(oSigningTimeAttr);


            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            var CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME = 1;
            yield oDocumentNameAttr.propset_Name(CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
            yield oDocumentNameAttr.propset_Value("Document Name");
            yield attr.Add(oDocumentNameAttr);

            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADES_BES = 1;

            var dataToSign = fileContent; // fileContent - объявлен в Code.js
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
                yield oSignedData.propset_Content(dataToSign);
            }
            yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
            try {
                // var StartTime = Date.now();
                // Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
                // var EndTime = Date.now();
                // document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + (EndTime - StartTime) + " мс";
                // var endTime = performance.now();

                document.getElementById("crypro_progress").innerHTML = "Operation finished";
                var endTime = performance.now();
                console.log('end measure');
                var operationTime = (endTime - window.startTime) / 1000;
                document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + operationTime + " с";
            }
            catch (err) {
                errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                throw errormes;
            }
            // document.getElementById("SignatureTxtBox").innerHTML = Signature; // a lot of memory
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
    }

    function SignCadesBES_Async_File2(certListBoxId, fileData) {
        cadesplugin.async_spawn(function*(arg) {
            var e = document.getElementById(arg[0]);
            var selectedCertID = e.selectedIndex;
            if (selectedCertID == -1) {
                alert("Select certificate");
                return;
            }
            var certificate = global_selectbox_container[selectedCertID];
            var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
            var Signature;
            try
            {
                //FillCertInfo_Async(certificate);
                var errormes = "";
                try {
                    var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                } catch (err) {
                    errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                    throw errormes;
                }
                var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
    
                var CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME = 0;
                yield oSigningTimeAttr.propset_Name(CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
                var oTimeNow = new Date();
                yield oSigningTimeAttr.propset_Value(oTimeNow);
                var attr = yield oSigner.AuthenticatedAttributes2;
                yield attr.Add(oSigningTimeAttr);
    
    
                var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
                var CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME = 1;
                yield oDocumentNameAttr.propset_Name(CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
                yield oDocumentNameAttr.propset_Value("Document Name");
                yield attr.Add(oDocumentNameAttr);
    
                if (oSigner) {
                    yield oSigner.propset_Certificate(certificate);
                }
                else {
                    errormes = "Failed to create CAdESCOM.CPSigner";
                    throw errormes;
                }
    
                var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                var CADES_BES = 1;
    
                var dataToSign = fileData; // fileContent - объявлен в Code.js
                if (dataToSign) {
                    // Данные на подпись ввели
                    yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
                    yield oSignedData.propset_Content(dataToSign);
                }
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                try {
                    var StartTime = Date.now();
                    Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
                    var EndTime = Date.now();
                    document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + (EndTime - StartTime) + " мс";
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
                document.getElementById("SignatureTxtBox").innerHTML = Signature;
                SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
            }
            catch(err)
            {
                SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
                document.getElementById("SignatureTxtBox").innerHTML = err;
            }
        }, certListBoxId); //cadesplugin.async_spawn
        }

    function SignCadesBES_Async_File3(certListBoxId, fileData) {
        return new Promise(function(resolve, reject) {
            cadesplugin.async_spawn(function*(arg) {
                var e = document.getElementById(arg[0]);
                var selectedCertID = e.selectedIndex;
                if (selectedCertID == -1) {
                    alert("Select certificate");
                    return;
                }
                var certificate = global_selectbox_container[selectedCertID];
                var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
                var Signature;
                try
                {
                    //FillCertInfo_Async(certificate);
                    var errormes = "";
                    try {
                        var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                    } catch (err) {
                        errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                        throw errormes;
                    }
                    var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
        
                    var CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME = 0;
                    yield oSigningTimeAttr.propset_Name(CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
                    var oTimeNow = new Date();
                    yield oSigningTimeAttr.propset_Value(oTimeNow);
                    var attr = yield oSigner.AuthenticatedAttributes2;
                    yield attr.Add(oSigningTimeAttr);
        
        
                    var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
                    var CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME = 1;
                    yield oDocumentNameAttr.propset_Name(CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
                    yield oDocumentNameAttr.propset_Value("Document Name");
                    yield attr.Add(oDocumentNameAttr);
        
                    if (oSigner) {
                        yield oSigner.propset_Certificate(certificate);
                    }
                    else {
                        errormes = "Failed to create CAdESCOM.CPSigner";
                        throw errormes;
                    }
        
                    var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                    var CADES_BES = 1;
        
                    var dataToSign = fileData; // fileContent - объявлен в Code.js
                    if (dataToSign) {
                        // Данные на подпись ввели
                        yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
                        yield oSignedData.propset_Content(dataToSign);
                    }
                    yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                    try {
                        // var StartTime = Date.now();
                        Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
                        // var EndTime = Date.now();
                        // var endTime = performance.now();
                        // console.log('end measure');
                        // var operationTime = (endTime - window.startTime) / 1000;
                        // document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + operationTime + " с";
                    }
                    catch (err) {
                        errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                        throw errormes;
                    }
                    document.getElementById("SignatureTxtBox").innerHTML = Signature;
                    SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";

                    // new
                    arg[2](Signature);
                }
                catch(err)
                {
                    SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
                    document.getElementById("SignatureTxtBox").innerHTML = err;
                    // new
                    arg[3]("Failed to create signature. Error: " + cadesplugin.getLastError(err));
                    // end of new
                }
            }, certListBoxId, fileData, resolve, reject); //cadesplugin.async_spawn
        })
        }


function SignCadesEnhanced_Async(certListBoxId, sign_type) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }
        var certificate = global_selectbox_container[selectedCertID];

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            //FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var tspService = document.getElementById("TSPServiceTxtBox").value ;

            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_Content(dataToSign);
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
            }
            yield oSigner.propset_TSAAddress(tspService);
            try {
                Signature = yield oSignedData.SignCades(oSigner, sign_type);
            }
            catch (err) {
                errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                throw errormes;
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
}

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
    // oSigner.Certificate = oCertificate;
    // oSigner.TSAAddress = "http://testca.cryptopro.ru/tsp/tsp.srf"
    await oSigner.propset_Certificate(oCertificate);
    // await oSigner.propset_TSAAddress("http://testca.cryptopro.ru/tsp/tsp.srf");

    // var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
    var oSignedData = await cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
    console.error('oSignedData', oSignedData);
    // oSignedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;
    await oSignedData.propset_ContentEncoding(CADESCOM_BASE64_TO_BINARY);

    try {
        console.error("oHashedData", oHashedData);
        console.error("oSigner", oSigner);
        console.error("CADESCOM_CADES_BES", CADESCOM_CADES_BES);
        var sSignedMessage = await oSignedData.SignHash(oHashedData, oSigner, CADESCOM_CADES_BES);
    } catch (err) {
        alert("Failed to create signature. Error: " + cadesplugin.getLastError(err));
        return;
    }

    // oStore.Close();

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
    console.error('HASH', oHashedData);
    // oHashedData.DataEncoding = CADESCOM_BASE64_TO_BINARY;
    await oHashedData.propset_DataEncoding(CADESCOM_BASE64_TO_BINARY);

    // var progress = document.getElementById("progressbar").childNodes.item(1);
    var progress = document.getElementById("progressbar");

    var frOnload = async function(e) {
        var header = ";base64,";
        var sFileData = e.target.result;
        var sBase64Data = sFileData.substr(sFileData.indexOf(header) + header.length);

        await oHashedData.Hash(sBase64Data);
        // await oHashedData.Hash("aHR0cHM6Ly9jaHJvbWUuZ29vZ2xlLmNvbS93ZWJzdG9yZS9kZXRhaWwvdHJ1c3QtcGx1Z2luLWV4dGVuc2lvbi9waWpuamJnZmprbG5uZWVqYWlqY2lpamxvb2dpY2Zrbj9obD1ydSZhdXRodXNlcj0w");

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
            await loadNext();
        }
        else {
            // document.getElementById("progressbar").style.visibility = "hidden";
            progress.value = 100;
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

async function doSign(id) {
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
    await signFile(oFile, certificate);
}

function SignCadesXML_Async(certListBoxId, signatureType) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var certificate = global_selectbox_container[selectedCertID];

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            //FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedXML = yield cadesplugin.CreateObjectAsync("CAdESCOM.SignedXML");

            var signMethod = "";
            var digestMethod = "";

            var pubKey = yield certificate.PublicKey();
            var algo = yield pubKey.Algorithm;
            var algoOid = yield algo.Value;
            if (algoOid == "1.2.643.7.1.1.1.1") {   // алгоритм подписи ГОСТ Р 34.10-2012 с ключом 256 бит
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-256";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256";
            }
            else if (algoOid == "1.2.643.7.1.1.1.2") {   // алгоритм подписи ГОСТ Р 34.10-2012 с ключом 512 бит
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-512";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-512";
            }
            else if (algoOid == "1.2.643.2.2.19") {  // алгоритм ГОСТ Р 34.10-2001
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102001-gostr3411";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411";
            }
            else {
                errormes = "Данная демо страница поддерживает XML подпись сертификатами с алгоритмом ГОСТ Р 34.10-2012, ГОСТ Р 34.10-2001";
                throw errormes;
            }
            
            var CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED = 0|arg[1]; //arg[1] = signatureType
            if (arg[1] > cadesplugin.CADESCOM_XADES_BES ) {
                var tspService = document.getElementById("TSPServiceTxtBox").value ;
                yield oSigner.propset_TSAAddress(tspService);
            }
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedXML.propset_Content(dataToSign);
            }
            yield oSignedXML.propset_SignatureType(CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED);
            yield oSignedXML.propset_SignatureMethod(signMethod);
            yield oSignedXML.propset_DigestMethod(digestMethod);

            try {
                Signature = yield oSignedXML.Sign(oSigner);
            }
            catch (err) {
                errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                throw errormes;
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId, signatureType); //cadesplugin.async_spawn
}

function FillCertInfo_Async(certificate, certBoxId, isFromContainer)
{
    var BoxId;
    var field_prefix;
    if(typeof(certBoxId) == 'undefined' || certBoxId == "CertListBox")
    {
        BoxId = 'cert_info';
        field_prefix = '';
    }else if (certBoxId == "CertListBox1") {
        BoxId = 'cert_info1';
        field_prefix = 'cert_info1';
    } else if (certBoxId == "CertListBox2") {
        BoxId = 'cert_info2';
        field_prefix = 'cert_info2';
    } else {
        BoxId = certBoxId;
        field_prefix = certBoxId;
    }
    cadesplugin.async_spawn (function*(args) {
        var Adjust = new CertificateAdjuster();

        var ValidToDate = new Date((yield args[0].ValidToDate));
        var ValidFromDate = new Date((yield args[0].ValidFromDate));
        var Validator;
        var IsValid = false;
        //если попадется сертификат с неизвестным алгоритмом
        //тут будет исключение. В таком сертификате просто пропускаем такое поле
        try {
            Validator = yield args[0].IsValid();
            IsValid = yield Validator.Result;
        } catch(e) {

        }
        var hasPrivateKey = yield args[0].HasPrivateKey();
        var Now = new Date();

        document.getElementById(args[1]).style.display = '';
        document.getElementById(args[2] + "subject").innerHTML = "Владелец: <b>" + Adjust.GetCertName(yield args[0].SubjectName) + "<b>";
        document.getElementById(args[2] + "issuer").innerHTML = "Издатель: <b>" + Adjust.GetIssuer(yield args[0].IssuerName) + "<b>";
        document.getElementById(args[2] + "from").innerHTML = "Выдан: <b>" + Adjust.GetCertDate(ValidFromDate) + " UTC<b>";
        document.getElementById(args[2] + "till").innerHTML = "Действителен до: <b>" + Adjust.GetCertDate(ValidToDate) + " UTC<b>";
        var pubKey = yield args[0].PublicKey();
        var algo = yield pubKey.Algorithm;
        var fAlgoName = yield algo.FriendlyName;
        document.getElementById(args[2] + "algorithm").innerHTML = "Алгоритм ключа: <b>" + fAlgoName + "<b>";
        if (hasPrivateKey) {
            var oPrivateKey = yield args[0].PrivateKey;
            var sProviderName = yield oPrivateKey.ProviderName;
            document.getElementById(args[2] + "provname").innerHTML = "Криптопровайдер: <b>" + sProviderName + "<b>";
            try {
                var sPrivateKeyLink = yield oPrivateKey.UniqueContainerName;
                document.getElementById(args[2] + "privateKeyLink").innerHTML = "Ссылка на закрытый ключ: <b>" + sPrivateKeyLink + "<b>";
            } catch (e) {
                document.getElementById(args[2] + "privateKeyLink").innerHTML = "Ссылка на закрытый ключ: <b>" + e.message + "<b>";
            }
        } else {
            document.getElementById(args[2] + "provname").innerHTML = "Криптопровайдер:<b>";
            document.getElementById(args[2] + "privateKeyLink").innerHTML = "Ссылка на закрытый ключ:<b>";
        }
        if(Now < ValidFromDate) {
            document.getElementById(args[2] + "status").innerHTML = "Статус: <span style=\"color:red; font-weight:bold; font-size:16px\"><b>Срок действия не наступил</b></span>";
        } else if( Now > ValidToDate){
            document.getElementById(args[2] + "status").innerHTML = "Статус: <span style=\"color:red; font-weight:bold; font-size:16px\"><b>Срок действия истек</b></span>";
        } else if( !hasPrivateKey ){
            document.getElementById(args[2] + "status").innerHTML = "Статус: <span style=\"color:red; font-weight:bold; font-size:16px\"><b>Нет привязки к закрытому ключу</b></span>";
        } else if( !IsValid ){
            document.getElementById(args[2] + "status").innerHTML = "Статус: <span style=\"color:red; font-weight:bold; font-size:16px\"><b>Ошибка при проверке цепочки сертификатов. Возможно на компьютере не установлены сертификаты УЦ, выдавшего ваш сертификат</b></span>";
        } else {
            document.getElementById(args[2] + "status").innerHTML = "Статус: <b> Действителен<b>";
        }

        if(args[3])
        {
            document.getElementById(field_prefix + "location").innerHTML = "Установлен в хранилище: <b>Нет</b>";            
        } else {
            document.getElementById(field_prefix + "location").innerHTML = "Установлен в хранилище: <b>Да</b>";
        }

    }, certificate, BoxId, field_prefix, isFromContainer);//cadesplugin.async_spawn
}

function Encrypt_Async() {
    cadesplugin.async_spawn (function*() {
        document.getElementById("DataEncryptedIV1").innerHTML = "";
        document.getElementById("DataEncryptedIV2").innerHTML = "";
        document.getElementById("DataEncryptedDiversData1").innerHTML = "";
        document.getElementById("DataEncryptedDiversData2").innerHTML = "";
        document.getElementById("DataEncryptedBox1").innerHTML = "";
        document.getElementById("DataEncryptedBox2").innerHTML = "";
        document.getElementById("DataEncryptedKey1").innerHTML = "";
        document.getElementById("DataEncryptedKey2").innerHTML = "";
        document.getElementById("DataDecryptedBox1").innerHTML = "";
        document.getElementById("DataDecryptedBox2").innerHTML = "";

        //Get First certificate
        var e = document.getElementById('CertListBox1');
        if (e.selectedIndex == -1) {
            alert("Select first certificate");
            return;
        }
        var selectedCertID = e[e.selectedIndex].value;
        var certificate1 = global_selectbox_container[selectedCertID];

        //Get second Certificate
        var e = document.getElementById('CertListBox2');
        if (e.selectedIndex == -1) {
            alert("Select second certificate");
            return;
        }
        var selectedCertID = e[e.selectedIndex].value;
        var certificate2 = global_selectbox_container[selectedCertID];

        var dataToEncr1 = Base64.encode(document.getElementById("DataToEncrTxtBox1").value);
        var dataToEncr2 = Base64.encode(document.getElementById("DataToEncrTxtBox2").value);

        if(dataToEncr1 === "" || dataToEncr2 === "") {
            errormes = "Empty data to encrypt";
            alert(errormes);
            throw errormes;
        }

        try
        {
            var errormes = "";

            try {
                var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
            } catch (err) {
                errormes = "Failed to create cadescom.symmetricalgorithm: " + err;
                alert(errormes);
                throw errormes;
            }

            yield oSymAlgo.GenerateKey();

            var oSesKey1 = yield oSymAlgo.DiversifyKey();
            var oSesKey1DiversData = yield oSesKey1.DiversData;
            var oSesKey1IV = yield oSesKey1.IV;
            var EncryptedData1 = yield oSesKey1.Encrypt(dataToEncr1, 1);
            document.getElementById("DataEncryptedDiversData1").innerHTML = oSesKey1DiversData;
            document.getElementById("DataEncryptedIV1").innerHTML = oSesKey1IV;
            document.getElementById("DataEncryptedBox1").innerHTML = EncryptedData1;

            var oSesKey2 = yield oSymAlgo.DiversifyKey();
            var oSesKey2DiversData = yield oSesKey2.DiversData;
            var oSesKey2IV = yield oSesKey2.IV;
            var EncryptedData2 = yield oSesKey2.Encrypt(dataToEncr2, 1);
            document.getElementById("DataEncryptedDiversData2").innerHTML = oSesKey2DiversData;
            document.getElementById("DataEncryptedIV2").innerHTML = oSesKey2IV;
            document.getElementById("DataEncryptedBox2").innerHTML = EncryptedData2;

            var ExportedKey1 = yield oSymAlgo.ExportKey(certificate1);
            document.getElementById("DataEncryptedKey1").innerHTML = ExportedKey1;

            var ExportedKey2 = yield oSymAlgo.ExportKey(certificate2);
            document.getElementById("DataEncryptedKey2").innerHTML = ExportedKey2;

            alert("Данные зашифрованы успешно:");
        }
        catch(err)
        {
            alert("Ошибка при шифровании данных:" + err);
            throw("Ошибка при шифровании данных:" + err);
        }
    });//cadesplugin.async_spawn
}

function Decrypt_Async(certListBoxId) {
    cadesplugin.async_spawn (function*(arg) {
        document.getElementById("DataDecryptedBox1").innerHTML = "";
        document.getElementById("DataDecryptedBox2").innerHTML = "";

        var e = document.getElementById(arg[0]);
        var selectedCertID = e[e.selectedIndex].value;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var certificate = global_selectbox_container[selectedCertID];

        var dataToDecr1 = document.getElementById("DataEncryptedBox1").value;
        var dataToDecr2 = document.getElementById("DataEncryptedBox2").value;
        var field;
        if(certListBoxId == 'CertListBox1')
            field ="DataEncryptedKey1";
        else
            field ="DataEncryptedKey2";

        var EncryptedKey = document.getElementById(field).value;
        try
        {
            FillCertInfo_Async(certificate, 'cert_info_decr');
            var errormes = "";

            try {
                var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
            } catch (err) {
                errormes = "Failed to create cadescom.symmetricalgorithm: " + err;
                alert(errormes);
                throw errormes;
            }

            yield oSymAlgo.ImportKey(EncryptedKey, certificate);

            var oSesKey1DiversData = document.getElementById("DataEncryptedDiversData1").value;
            var oSesKey1IV = document.getElementById("DataEncryptedIV1").value;
            yield oSymAlgo.propset_DiversData(oSesKey1DiversData);
            var oSesKey1 = yield oSymAlgo.DiversifyKey();
            yield oSesKey1.propset_IV(oSesKey1IV);
            var EncryptedData1 = yield oSesKey1.Decrypt(dataToDecr1, 1);
            document.getElementById("DataDecryptedBox1").innerHTML = Base64.decode(EncryptedData1);

            var oSesKey2DiversData = document.getElementById("DataEncryptedDiversData2").value;
            var oSesKey2IV = document.getElementById("DataEncryptedIV2").value;
            yield oSymAlgo.propset_DiversData(oSesKey2DiversData);
            var oSesKey2 = yield oSymAlgo.DiversifyKey();
            yield oSesKey2.propset_IV(oSesKey2IV);
            var EncryptedData2 = yield oSesKey2.Decrypt(dataToDecr2, 1);
            document.getElementById("DataDecryptedBox2").innerHTML = Base64.decode(EncryptedData2);

            alert("Данные расшифрованы успешно:");
        }
        catch(err)
        {
            alert("Ошибка при шифровании данных:" + err);
            throw("Ошибка при шифровании данных:" + err);
        }
    }, certListBoxId);//cadesplugin.async_spawn
}

function RetrieveCertificate_Async()
{
    cadesplugin.async_spawn (function*(arg) {
        try {
            var PrivateKey = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509PrivateKey");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509PrivateKey: ' + cadesplugin.getLastError(e));
            return;
        }

        yield PrivateKey.propset_ProviderName("Crypto-Pro GOST R 34.10-2012 Cryptographic Service Provider");
        yield PrivateKey.propset_ProviderType(80);
        yield PrivateKey.propset_KeySpec(1); //XCN_AT_KEYEXCHANGE

        try {
            var CertificateRequestPkcs10 = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509CertificateRequestPkcs10");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509CertificateRequestPkcs10: ' + cadesplugin.getLastError(e));
            return;
        }

        yield CertificateRequestPkcs10.InitializeFromPrivateKey(0x1, PrivateKey, "");

        try {
            var DistinguishedName = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX500DistinguishedName");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX500DistinguishedName: ' + cadesplugin.getLastError(e));
            return;
        }

        var CommonName = "Test Certificate";
        yield DistinguishedName.Encode("CN=\""+CommonName.replace(/"/g, "\"\"")+"\"");

        yield CertificateRequestPkcs10.propset_Subject(DistinguishedName);

        var KeyUsageExtension = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509ExtensionKeyUsage");
        var CERT_DATA_ENCIPHERMENT_KEY_USAGE = 0x10;
        var CERT_KEY_ENCIPHERMENT_KEY_USAGE = 0x20;
        var CERT_DIGITAL_SIGNATURE_KEY_USAGE = 0x80;
        var CERT_NON_REPUDIATION_KEY_USAGE = 0x40;

        yield KeyUsageExtension.InitializeEncode(
                    CERT_KEY_ENCIPHERMENT_KEY_USAGE |
                    CERT_DATA_ENCIPHERMENT_KEY_USAGE |
                    CERT_DIGITAL_SIGNATURE_KEY_USAGE |
                    CERT_NON_REPUDIATION_KEY_USAGE);

        yield (yield CertificateRequestPkcs10.X509Extensions).Add(KeyUsageExtension);

        try {
            var Enroll = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509Enrollment");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509Enrollment: ' + cadesplugin.getLastError(e));
            return;
        }
        
        var cert_req;
        try {
            yield Enroll.InitializeFromRequest(CertificateRequestPkcs10);
            cert_req = yield Enroll.CreateRequest(0x1);
        } catch (e) {
            alert('Failed to generate KeyPair or reguest: ' + cadesplugin.getLastError(e));
            return;    
        }

        var params = 'CertRequest=' + encodeURIComponent(cert_req) +
                     '&Mode=' + encodeURIComponent('newreq') +
                     '&TargetStoreFlags=' + encodeURIComponent('0') +
                     '&SaveCert=' + encodeURIComponent('no');

        var xmlhttp = getXmlHttp();
        xmlhttp.open("POST", "https://testca.cryptopro.ru/certsrv/certfnsh.asp", true);
        xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        var response;
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                if(xmlhttp.status == 200) {
                    cadesplugin.async_spawn (function*(arg) {
                        var response = arg[0];
                        var cert_data = "";

                        if(!isIE())
                        {
                            var start = response.indexOf("var sPKCS7");
                            var end = response.indexOf("sPKCS7 += \"\"") + 13;
                            cert_data = response.substring(start, end);
                        }
                        else
                        {
                            var start = response.indexOf("sPKCS7 & \"") + 9;
                            var end = response.indexOf("& vbNewLine\r\n\r\n</Script>");
                            cert_data = response.substring(start, end);
                            cert_data = cert_data.replace(new RegExp(" & vbNewLine",'g'),";");
                            cert_data = cert_data.replace(new RegExp("&",'g'),"+");
                            cert_data = "var sPKCS7=" + cert_data + ";";
                        }

                        eval(cert_data);

                        try {
                            var Enroll = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509Enrollment");
                        }
                        catch (e) {
                            alert('Failed to create X509Enrollment.CX509Enrollment: ' + cadesplugin.getLastError(e));
                            return;
                        }

                        yield Enroll.Initialize(0x1);
                        yield Enroll.InstallResponse(0, sPKCS7, 0x7, "");
                        document.getElementById("boxdiv").style.display = 'none';
                        if(location.pathname.indexOf("simple")>=0) {
                            location.reload();
                        }
                        else if(location.pathname.indexOf("symalgo_sample.html")>=0){
                            FillCertList_Async('CertListBox1');
                            FillCertList_Async('CertListBox2');
                        }
                        else{
                            FillCertList_Async('CertListBox');
                        }
                    }, xmlhttp.responseText);//cadesplugin.async_spawn
                }
            }
        }
        xmlhttp.send(params);
    });//cadesplugin.async_spawn
}

function CheckForPlugInUEC_Async()
{
    var isUECCSPInstalled = false;

    cadesplugin.async_spawn(function *() {
        var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");

        var UECCSPVersion;
        var CurrentPluginVersion = yield oAbout.PluginVersion;
        if( typeof(CurrentPluginVersion) == "undefined")
            CurrentPluginVersion = yield oAbout.Version;

        var PluginBaseVersion = "1.5.1633";
        var arr = PluginBaseVersion.split('.');

        var isActualVersion = true;

        if((yield CurrentPluginVersion.MajorVersion) == parseInt(arr[0]))
        {
            if((yield CurrentPluginVersion.MinorVersion) == parseInt(arr[1]))
            {
                if((yield CurrentPluginVersion.BuildVersion) == parseInt(arr[2]))
                {
                    isActualVersion = true;
                }
                else if((yield CurrentPluginVersion.BuildVersion) < parseInt(arr[2]))
                {
                    isActualVersion = false;
                }
            }else if((yield CurrentPluginVersion.MinorVersion) < parseInt(arr[1]))
            {
                    isActualVersion = false;
            }
        }else if((yield CurrentPluginVersion.MajorVersion) < parseInt(arr[0]))
        {
            isActualVersion = false;
        }

        if(!isActualVersion)
        {
            document.getElementById('PluginEnabledImg').setAttribute("src", "Img/yellow_dot.png");
            document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен, но он не поддерживает УЭК.";
        }
        else
        {
            document.getElementById('PluginEnabledImg').setAttribute("src", "Img/green_dot.png");
            document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен";

            try
            {
                var oUECard = yield cadesplugin.CreateObjectAsync("CAdESCOM.UECard");
                UECCSPVersion = yield oUECard.ProviderVersion;
                isUECCSPInstalled = true;
            }
            catch (err)
            {
                UECCSPVersion = "Нет информации";
            }

            if(!isUECCSPInstalled)
            {
                document.getElementById('PluginEnabledImg').setAttribute("src", "Img/yellow_dot.png");
                document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен. Не установлен УЭК CSP.";
            }
        }
        document.getElementById('PlugInVersionTxt').innerHTML = "Версия плагина: " + (yield CurrentPluginVersion.toString());
        document.getElementById('CSPVersionTxt').innerHTML = "Версия УЭК CSP: " + (yield UECCSPVersion.toString());
    }); //cadesplugin.async_spawn
}

function FoundCertInStore_Async(cerToFind) {
    return new Promise(function(resolve, reject){
        cadesplugin.async_spawn(function *(args) {

            if((typeof cerToFind == "undefined") || (cerToFind == null))
                args[0](false);

            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.store");
            if (!oStore) {
                alert("store failed");
                args[0](false);
            }
            try {
                yield oStore.Open();
            }
            catch (ex) {
                alert("Certificate not found");
                args[0](false);
            }

            var Certificates = yield oStore.Certificates;
            var certCnt = yield Certificates.Count;
            if(certCnt==0)
            {
                oStore.Close();
                args[0](false);
            }

            var ThumbprintToFind = yield cerToFind.Thumbprint;

            for (var i = 1; i <= certCnt; i++) {
                var cert;
                try {
                    cert = yield Certificates.Item(i);
                }
                catch (ex) {
                    alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                    args[0](false);
                }

                try {
                    var Thumbprint = yield cert.Thumbprint;
                    if(Thumbprint == ThumbprintToFind) {
                        var dateObj = new Date();
                        var ValidToDate = new Date(yield cert.ValidToDate);
                        var HasPrivateKey = yield cert.HasPrivateKey();
                        var IsValid = yield cert.IsValid();
                        IsValid = yield IsValid.Result;

                        if(dateObj<ValidToDate && HasPrivateKey && IsValid) {
                            args[0](true);
                        }
                    }
                    else {
                        continue;
                    }
                }
                catch (ex) {
                    alert("Ошибка при получении свойства Thumbprint: " + cadesplugin.getLastError(ex));
                    args[0](false);
                }
            }
            oStore.Close();

            args[0](false);

        }, resolve, reject);
    });
}

function getUECCertificate_Async() {
    return new Promise(function(resolve, reject)
        {
            showWaitMessage("Выполняется загрузка сертификата, это может занять несколько секунд...");
            cadesplugin.async_spawn(function *(args) {
                try {
                    var oCard = yield cadesplugin.CreateObjectAsync("CAdESCOM.UECard");
                    var oCertTemp = yield oCard.Certificate;

                    if(typeof oCertTemp == "undefined")
                    {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден или отсутствует.";
                        throw "";
                    }

                    if(oCertTemp==null)
                    {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден или отсутствует.";
                        throw "";
                    }

                    if(yield FoundCertInStore_Async(oCertTemp)) {
                        FillCertInfo_Async(oCertTemp);
                        g_oCert = oCertTemp;
                    }
                    else {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден в хранилище MY.";
                        throw "";
                    }
                    args[0]();
                }
                catch (e) {
                    var message = cadesplugin.getLastError(e);
                    if("The action was cancelled by the user. (0x8010006E)" == message) {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Карта не найдена или отсутствует сертификат на карте.";
                    }
                    args[1]();
                }
            }, resolve, reject);
        });
}

function createSignature_Async() {
    return new Promise(function(resolve, reject){
        cadesplugin.async_spawn(function *(args) {
            var signedMessage = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                yield oSigner.propset_Certificate(g_oCert);
                var CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN = 1;
                yield oSigner.propset_Options(CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);

                var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                yield oSignedData.propset_Content("DataToSign");

                var CADES_BES = 1;
                signedMessage = yield oSignedData.SignCades(oSigner, CADES_BES);
                args[0](signedMessage);
            }
            catch (e) {
                showErrorMessage("Ошибка: Не удалось создать подпись. Код ошибки: " + cadesplugin.getLastError(e));
                args[1]("");
            }
            args[0](signedMessage);
        }, resolve, reject);
    });
}

function verifyCert_Async() {
    if (!g_oCert) {
        removeWaitMessage();
        return;
    }
    createSignature_Async().then(
        function(signedMessage){
            document.getElementById("SignatureTxtBox").innerHTML = signedMessage;
            var x = document.getElementsByName("SignatureTitle");
            x[0].innerHTML = "Подпись сформирована успешно:";
            removeWaitMessage();
        },
        function(signedMessage){
            removeWaitMessage();
        }
    );
}

function isIE() {
    var retVal = (("Microsoft Internet Explorer" == navigator.appName) || // IE < 11
        navigator.userAgent.match(/Trident\/./i)); // IE 11
    return retVal;
}

async_resolve();

