/* =====================================================================
   myFunctions.js  -  جميع توابع الموقع في ملف واحد (جافاسكريبت + jQuery)
   ---------------------------------------------------------------------
   الأقسام:
   1) ثوابت عامة
   2) توابع مساعدة (تنسيق الأرقام، التواريخ)
   3) توابع التحقق من المدخلات (كل تابع يعيد نص الخطأ أو "" إن كانت القيمة صحيحة)
   4) توابع الحساب (عدد الأيام، المجموع، الخصم)
   5) توابع التعامل مع الصفحة (قراءة الجدول، إظهار الأخطاء، النافذة)
   6) ربط الأحداث عند تحميل الصفحة (jQuery)
   ===================================================================== */


/* ---------------------------------------------------------------------
   1) ثوابت عامة
   --------------------------------------------------------------------- */
var DISCOUNT_MIN_DAYS = 7;        // الخصم يُطبَّق إذا تجاوزت المدة هذا العدد من الأيام
var DISCOUNT_RATE = 0.10;         // نسبة الخصم 10%
var MS_PER_DAY = 24 * 60 * 60 * 1000;


/* ---------------------------------------------------------------------
   2) توابع مساعدة
   --------------------------------------------------------------------- */

/* تنسيق الرقم بفواصل آلاف: 1250000 -> 1,250,000 */
function formatNumber(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* تحويل نص تاريخ إلى كائن Date (بالتوقيت العالمي).
   يقبل yyyy-mm-dd (الصيغة المعتمدة) وكذلك dd-mm-yyyy.
   يعيد null إذا كانت الصيغة خاطئة أو التاريخ غير موجود فعلياً (مثل 2026-02-30). */
function parseDate(text) {
    var s = text.trim();
    var year, month, day;
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);

    if (parts) {
        year = Number(parts[1]);
        month = Number(parts[2]);
        day = Number(parts[3]);
    } else {
        parts = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
        if (!parts) {
            return null;
        }
        day = Number(parts[1]);
        month = Number(parts[2]);
        year = Number(parts[3]);
    }

    var date = new Date(Date.UTC(year, month - 1, day));
    // نتأكد أن التاريخ لم "ينزلق" إلى شهر آخر (مثال: 31 شباط)
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        return null;
    }
    return date;
}


/* ---------------------------------------------------------------------
   3) توابع التحقق من المدخلات
   الحقول الإلزامية: الرقم الوطني + تاريخا البداية والنهاية
   باقي الحقول تقبل القيمة الفارغة، وإذا كُتبت فيها قيمة وجب أن تكون صحيحة.
   --------------------------------------------------------------------- */

/* الاسم الكامل: أحرف هجائية عربية فقط (كلمة واحدة أو أكثر تفصل بينها مسافات) */
function checkFullName(value) {
    var v = value.trim();
    if (v === "") {
        return "";                                   // اختياري
    }
    var arabicWords = /^[ء-ي]+(\s+[ء-ي]+)*$/;
    if (!arabicWords.test(v)) {
        return "الاسم يجب أن يحتوي أحرفاً عربية فقط (دون أرقام أو رموز أو أحرف لاتينية).";
    }
    if (v.split(/\s+/).length < 2) {
        return "الرجاء كتابة الاسم الكامل (الاسم والكنية على الأقل).";
    }
    return "";
}

/* الرقم الوطني: إلزامي، 11 خانة رقمية، أول خانتين بين 01 و14 */
function checkNationalId(value) {
    var v = value.trim();
    if (v === "") {
        return "الرقم الوطني إلزامي.";
    }
    if (!/^\d+$/.test(v)) {
        return "الرقم الوطني يجب أن يتكون من أرقام فقط.";
    }
    if (v.length !== 11) {
        return "الرقم الوطني يجب أن يتكون من 11 خانة (أدخلت " + v.length + ").";
    }
    var province = Number(v.substring(0, 2));
    if (province < 1 || province > 14) {
        return "أول خانتين تمثلان المحافظة ويجب أن تكونا بين 01 و 14.";
    }
    return "";
}

/* تاريخ البداية: إلزامي وبصيغة صحيحة */
function checkStartDate(value) {
    var v = value.trim();
    if (v === "") {
        return "تاريخ بداية التأجير إلزامي.";
    }
    if (parseDate(v) === null) {
        return "تاريخ غير صالح. استخدم الصيغة yyyy-mm-dd وتاريخاً موجوداً فعلاً.";
    }
    return "";
}

/* تاريخ النهاية: إلزامي وبصيغة صحيحة ولاحق لتاريخ البداية */
function checkEndDate(value) {
    var v = value.trim();
    if (v === "") {
        return "تاريخ نهاية التأجير إلزامي.";
    }
    var end = parseDate(v);
    if (end === null) {
        return "تاريخ غير صالح. استخدم الصيغة yyyy-mm-dd وتاريخاً موجوداً فعلاً.";
    }
    var start = parseDate($("#startDate").val());
    if (start !== null && end.getTime() <= start.getTime()) {
        return "تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.";
    }
    return "";
}

/* رقم الموبايل: Syriatel (093, 098, 099) أو MTN (094, 095, 096)
   يقبل الصيغ: 0944123456  أو  +963944123456  أو  00963944123456  أو  963944123456 */
function checkMobile(value) {
    var v = value.replace(/[\s\-]/g, "");
    if (v === "") {
        return "";                                   // اختياري
    }
    if (!/^(?:0|00963|\+?963)9[345689]\d{7}$/.test(v)) {
        return "رقم غير صالح. يجب أن يطابق شبكة Syriatel (093، 098، 099) أو MTN (094، 095، 096) ويتكون من 10 أرقام.";
    }
    return "";
}

/* معرفة شبكة الموبايل من الرمز (يُستخدم في نافذة النتيجة) */
function getOperator(value) {
    var v = value.replace(/[\s\-]/g, "");
    var code = v.substring(v.length - 9, v.length - 7);   // مثل "94"
    if (code === "93" || code === "98" || code === "99") {
        return "Syriatel";
    }
    if (code === "94" || code === "95" || code === "96") {
        return "MTN";
    }
    return "";
}

/* البريد الإلكتروني: اختياري، وإن وُجد يجب أن يكون بصيغة صحيحة */
function checkEmail(value) {
    var v = value.trim();
    if (v === "") {
        return "";                                   // اختياري
    }
    var emailPattern = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
    if (!emailPattern.test(v)) {
        return "البريد الإلكتروني غير صالح (مثال صحيح: name@example.com).";
    }
    return "";
}

/* جدول قواعد التحقق: رقم الحقل + التابع المسؤول عن فحصه (بنفس ترتيب النموذج) */
var FIELD_RULES = [
    { id: "fullName",   check: checkFullName },
    { id: "nationalId", check: checkNationalId },
    { id: "startDate",  check: checkStartDate },
    { id: "endDate",    check: checkEndDate },
    { id: "mobile",     check: checkMobile },
    { id: "email",      check: checkEmail }
];


/* ---------------------------------------------------------------------
   4) توابع الحساب
   --------------------------------------------------------------------- */

/* عدد أيام التأجير = الفرق بين تاريخ النهاية وتاريخ البداية */
function daysBetween(startDate, endDate) {
    return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

/* حساب الفاتورة:
   cars: مصفوفة سيارات {code, model, price}
   days: عدد الأيام
   الناتج: السطور + المجموع + الخصم + المبلغ النهائي */
function calculateInvoice(cars, days) {
    var lines = [];
    var total = 0;

    for (var i = 0; i < cars.length; i++) {
        var subtotal = cars[i].price * days;
        total += subtotal;
        lines.push({
            code: cars[i].code,
            model: cars[i].model,
            price: cars[i].price,
            days: days,
            subtotal: subtotal
        });
    }

    var discount = 0;
    if (days > DISCOUNT_MIN_DAYS) {
        discount = total * DISCOUNT_RATE;
    }

    return {
        lines: lines,
        total: total,
        discount: discount,
        finalAmount: total - discount
    };
}


/* ---------------------------------------------------------------------
   5) توابع التعامل مع الصفحة
   --------------------------------------------------------------------- */

/* قراءة السيارات المختارة من جدول الصفحة (قراءة محتوى HTML بواسطة jQuery) */
function getSelectedCars() {
    var cars = [];
    $("#carsTable input.select-car:checked").each(function () {
        var row = $(this).closest("tr");
        cars.push({
            code: $(this).val(),
            model: row.find("td.model").text(),
            price: parseInt(row.find("td.price span.num").text(), 10)
        });
    });
    return cars;
}

/* عرض ملخص السيارات المختارة أعلى نموذج الحجز */
function showSelectedSummary(cars) {
    var summary = $("#selectedSummary");
    summary.empty();
    summary.append($("<strong/>").text("السيارات المختارة:"));
    var list = $("<ul/>");
    for (var i = 0; i < cars.length; i++) {
        list.append($("<li/>").text(cars[i].code + " - " + cars[i].model + " (" + formatNumber(cars[i].price) + " ل.س / اليوم)"));
    }
    summary.append(list);
}

/* إظهار أو مسح رسالة الخطأ تحت حقل معيّن */
function setFieldError(fieldId, message) {
    $("#" + fieldId + "Error").text(message);
    $("#" + fieldId).toggleClass("invalid", message !== "");
}

/* التحقق من حقل واحد (يُستدعى عند مغادرة الحقل) */
function validateField(fieldId) {
    for (var i = 0; i < FIELD_RULES.length; i++) {
        if (FIELD_RULES[i].id === fieldId) {
            var message = FIELD_RULES[i].check($("#" + fieldId).val());
            setFieldError(fieldId, message);
            return message === "";
        }
    }
    return true;
}

/* التحقق من كامل النموذج.
   إذا كان كل شيء صحيحاً يعيد كائن النتيجة، وإلا يعيد null بعد إظهار الأخطاء. */
function validateBooking() {
    var firstInvalid = null;
    var allValid = true;

    for (var i = 0; i < FIELD_RULES.length; i++) {
        var id = FIELD_RULES[i].id;
        if (!validateField(id)) {
            allValid = false;
            if (firstInvalid === null) {
                firstInvalid = id;
            }
        }
    }

    var cars = getSelectedCars();
    if (cars.length === 0) {
        $("#bookingMsg").text("لم يتم اختيار أي سيارة. ارجع إلى الجدول واختر سيارة واحدة على الأقل.").show();
        allValid = false;
    } else {
        $("#bookingMsg").hide();
    }

    if (!allValid) {
        if (firstInvalid !== null) {
            $("#" + firstInvalid).focus();
        }
        return null;
    }

    var start = parseDate($("#startDate").val());
    var end = parseDate($("#endDate").val());
    var days = daysBetween(start, end);

    return {
        name: $("#fullName").val().trim(),
        nationalId: $("#nationalId").val().trim(),
        startText: $("#startDate").val().trim(),
        endText: $("#endDate").val().trim(),
        mobile: $("#mobile").val().replace(/[\s\-]/g, ""),
        email: $("#email").val().trim(),
        days: days,
        invoice: calculateInvoice(cars, days)
    };
}

/* إضافة سطر (عنوان: قيمة) إلى نافذة النتيجة */
function addInfoLine(container, label, value) {
    var p = $("<p/>");
    p.append($("<strong/>").text(label + ": "));
    p.append($("<span/>").text(value));
    container.append(p);
}

/* بناء نافذة النتيجة وإظهارها */
function showResultWindow(result) {
    var body = $("#resultBody");
    body.empty();

    if (result.name !== "") {
        addInfoLine(body, "الاسم", result.name);
    }
    addInfoLine(body, "الرقم الوطني", result.nationalId);
    addInfoLine(body, "تاريخ بداية التأجير", result.startText);
    addInfoLine(body, "تاريخ نهاية التأجير", result.endText);
    addInfoLine(body, "عدد أيام التأجير", result.days + " يوم");
    if (result.mobile !== "") {
        addInfoLine(body, "الموبايل", result.mobile + " (" + getOperator(result.mobile) + ")");
    }
    if (result.email !== "") {
        addInfoLine(body, "البريد الإلكتروني", result.email);
    }

    // جدول السيارات المختارة
    var table = $("<table/>").addClass("result-table");
    var head = $("<tr/>");
    var titles = ["الرمز", "الموديل", "السعر اليومي", "عدد الأيام", "المجموع الجزئي"];
    for (var h = 0; h < titles.length; h++) {
        head.append($("<th/>").text(titles[h]));
    }
    table.append($("<thead/>").append(head));

    var tbody = $("<tbody/>");
    for (var i = 0; i < result.invoice.lines.length; i++) {
        var line = result.invoice.lines[i];
        var tr = $("<tr/>");
        tr.append($("<td/>").text(line.code));
        tr.append($("<td/>").text(line.model));
        tr.append($("<td/>").text(formatNumber(line.price)));
        tr.append($("<td/>").text(line.days));
        tr.append($("<td/>").text(formatNumber(line.subtotal)));
        tbody.append(tr);
    }
    table.append(tbody);
    body.append(table);

    // المجموع والخصم والمبلغ النهائي
    addInfoLine(body, "المجموع قبل الخصم", formatNumber(result.invoice.total) + " ل.س");

    if (result.invoice.discount > 0) {
        var discountLine = $("<p/>").addClass("discount-line");
        discountLine.text("الخصم 10% (المدة أكثر من " + DISCOUNT_MIN_DAYS + " أيام): - " +
                          formatNumber(result.invoice.discount) + " ل.س");
        body.append(discountLine);
    } else {
        body.append($("<p/>").text("لا يوجد خصم (مدة التأجير " + DISCOUNT_MIN_DAYS + " أيام أو أقل)."));
    }

    var finalLine = $("<p/>").addClass("final-amount");
    finalLine.text("المبلغ النهائي: " + formatNumber(result.invoice.finalAmount) + " ل.س");
    body.append(finalLine);

    $("#resultOverlay").fadeIn(250);
}

function closeResultWindow() {
    $("#resultOverlay").fadeOut(200);
}

/* الخروج من الموقع: تأكيد ثم محاولة إغلاق النافذة، وإلا تظهر رسالة وداع */
function exitSite() {
    if (!window.confirm("هل تريد الخروج من الموقع؟")) {
        return;
    }
    window.close();   // تنجح فقط إذا كانت النافذة قد فُتحت بواسطة سكربت
    setTimeout(function () {
        $("body").html(
            '<div class="goodbye">' +
            '<h1>شكراً لزيارتكم مكتب تأجير السيارات</h1>' +
            '<p>يمكنكم إغلاق هذه النافذة الآن.</p>' +
            '<p><a href="home.html">العودة إلى الموقع</a></p>' +
            '</div>'
        );
    }, 150);
}


/* ---------------------------------------------------------------------
   6) ربط الأحداث عند اكتمال تحميل الصفحة (jQuery)
   --------------------------------------------------------------------- */
$(document).ready(function () {

    /* ---- رابط الخروج (موجود في كل الصفحات) ---- */
    $("a.exit-link").on("click", function (event) {
        event.preventDefault();
        exitSite();
    });

    /* ---- بقية الكود خاص بصفحة السيارات فقط ---- */
    if ($("#carsTable").length === 0) {
        return;
    }

    /* 1) إظهار/إخفاء تفاصيل السيارة عند الضغط على المربع (عدة سيارات معاً) */
    $("#carsTable").on("change", "input.show-details", function () {
        var detailsRow = $("#rowDetails-" + $(this).val());
        if (this.checked) {
            detailsRow.fadeIn(250);
        } else {
            detailsRow.fadeOut(250);
        }
    });

    /* 2) تلوين صف السيارة المختارة */
    $("#carsTable").on("change", "input.select-car", function () {
        $(this).closest("tr").toggleClass("selected", this.checked);
    });

    /* 3) زر "متابعة": التحقق من وجود سيارة مختارة ثم إظهار النموذج */
    $("#continueBtn").on("click", function () {
        var cars = getSelectedCars();

        if (cars.length === 0) {
            $("#selectionMsg").text("الرجاء اختيار سيارة واحدة على الأقل قبل المتابعة.").fadeIn(200);
            $("#bookingSection").slideUp(250);
            return;
        }

        $("#selectionMsg").hide();
        showSelectedSummary(cars);
        $("#bookingSection").slideDown(350, function () {
            $("#fullName").focus();
        });
        $("html, body").animate({ scrollTop: $("#bookingSection").offset().top - 20 }, 400);
    });

    /* 4) التحقق من كل حقل عند مغادرته */
    for (var i = 0; i < FIELD_RULES.length; i++) {
        $("#" + FIELD_RULES[i].id).on("blur", function () {
            validateField($(this).attr("id"));
        });
    }
    // تعديل تاريخ البداية قد يغيّر صلاحية تاريخ النهاية
    $("#startDate").on("blur", function () {
        if ($("#endDate").val().trim() !== "") {
            validateField("endDate");
        }
    });

    /* 5) زر "إرسال" */
    $("#bookingForm").on("submit", function (event) {
        event.preventDefault();               // لا نعيد تحميل الصفحة
        var result = validateBooking();
        if (result !== null) {
            showResultWindow(result);
        }
    });

    /* 6) زر "مسح الحقول": إزالة رسائل الأخطاء أيضاً */
    $("#bookingForm").on("reset", function () {
        $("#bookingForm .error").text("");
        $("#bookingForm input.invalid").removeClass("invalid");
        $("#bookingMsg").hide();
    });

    /* 7) إغلاق نافذة النتيجة: زر الإغلاق أو الضغط خارجها أو مفتاح Esc */
    $("#closeResult").on("click", closeResultWindow);
    $("#resultOverlay").on("click", function (event) {
        if (event.target === this) {
            closeResultWindow();
        }
    });
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeResultWindow();
        }
    });
});
