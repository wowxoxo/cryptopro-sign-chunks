var elems_before_signing =
    ['DataToSign', 'DataToSignItemBorder', 'DataToSignTxtBox', 'SignData', 'TSPService', 'TSPServiceItemBorder', 'TSPServiceTxtBox'];
var elems_after_signing =
    ['SignatureTitle', 'SignatureTitleItemBorder', 'TimeTitle'];
var isFileOpened = false;

function hide_elem(elem_name) {
    var a = document.getElementsByName(elem_name);
    for (var i = 0; i < a.length; i++) {
        a[i].style.display = 'none';
    }
}

function show_elem(elem_name) {
    var a = document.getElementsByName(elem_name);
    for (var i = 0; i < a.length; i++) {
        a[i].style.display = 'block';
    }
}

function highlight_elem(elem_name) {
    var a = document.getElementsByName(elem_name);
    for (var i = 0; i < a.length; i++) {
        a[i].style["boxShadow"] = "0 0 20px #FDFF47";
    }
}

function restore_elem(elem_name) {
    var a = document.getElementsByName(elem_name);
    for (var i = 0; i < a.length; i++) {
        a[i].style["boxShadow"] = "0 0 0px";
    }
}

function step_1() {
    setInterval(function () {
        if (document.getElementById('CertListBox').selectedIndex !== -1)
            step_2();
    }, 500);
    document.getElementById('SignBtn').addEventListener("click", step_3);
    document.getElementById('SignBtn2').addEventListener("click", step_3);
    document.getElementById('SignBtn3').addEventListener("click", step_3);
    document.getElementById('SignBtn4').addEventListener("click", step_3);
    for (var i = 0; i < elems_before_signing.length; i++) {
        hide_elem(elems_before_signing[i]);
    }
    for (i = 0; i < elems_after_signing.length; i++) {
        hide_elem(elems_after_signing[i]);
    }
    highlight_elem("CertListBoxToHide");
}

function step_2() {
    restore_elem("CertListBoxToHide");
    if (document.getElementById("openFileButton") === null) {
        if (document.getElementById("SignatureTxtBox").value === "") {
            highlight_elem("SignData");
        }
        else {
            restore_elem("SignData");
        }
    }
    else {
        if (!isFileOpened)
            highlight_elem("openFileButton");
        document.getElementById('openFileButton').addEventListener("change", function () {
            restore_elem("openFileButton");
            highlight_elem("SignData");
            isFileOpened = true;
        });
    }
    for (var i = 0; i < elems_before_signing.length; i++) {
        show_elem(elems_before_signing[i]);
    }
}

function step_3() {
    restore_elem("SignData");
    for (var i = 0; i < elems_after_signing.length; i++) {
        show_elem(elems_after_signing[i]);
    }
    document.getElementsByName("CertificateTitle")[0].scrollIntoView();
    setTimeout(function () {
        restore_elem("SignatureTitleItemBorder");
    }, 3000);
    highlight_elem("SignatureTitleItemBorder");
}

step_1();
