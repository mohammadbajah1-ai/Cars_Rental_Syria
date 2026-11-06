/* myFunctions.js - توابع التحقق من المدخلات وحساب التكلفة والتفاعل مع الصفحات */

var DISCOUNT_THRESHOLD_DAYS = 7;
var DISCOUNT_PERCENT = 0.10;
var ONE_DAY_MS = 24 * 60 * 60 * 1000;

/* تنسيق المبالغ المالية بفواصل الآلاف */
function formatCurrency(amount) {
    return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* تحليل التاريخ والتحقق من مطابقته للصيغة yyyy-mm-dd حصراً وصحته تقويمياً */
function parseStrictDate(dateStr) {
    var text = dateStr.trim();
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) {
        return null;
    }

    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var day = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    var d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || (d.getUTCMonth() + 1) !== month || d.getUTCDate() !== day) {
        return null;
    }
    return d;
}

/* 1. التحقق من الاسم الكامل: اختياري، وإن أُدخل يجب أن يتكون من أحرف هجائية عربية فقط */
function checkFullName(value) {
    var v = value.trim();
    if (v === "") {
        return "";
    }
    var arabicRegex = /^[\u0621-\u063A\u0641-\u064A]+(\s+[\u0621-\u063A\u0641-\u064A]+)*$/;
    if (!arabicRegex.test(v)) {
        return "يرجى إدخال الاسم بأحرف هجائية عربية فقط دون أرقام أو رموز.";
    }
    return "";
}

/* 2. التحقق من الرقم الوطني: إلزامي، 11 خانة رقمية، وأول خانتين بين 01 و 14 */
function checkNationalId(value) {
    var v = value.trim();
    if (v === "") {
        return "حقل الرقم الوطني إلزامي الإدخال.";
    }
    if (!/^\d{11}$/.test(v)) {
        return "يجب أن يتكون الرقم الوطني من 11 خانة رقمية بالضبط.";
    }
    var govCode = parseInt(v.substring(0, 2), 10);
    if (govCode < 1 || govCode > 14) {
        return "أول خانتين من الرقم الوطني ترمزان إلى المحافظة ويجب أن تكونا بين 01 و 14.";
    }
    return "";
}

/* 3. التحقق من تاريخ بداية التأجير: إلزامي وبصيغة yyyy-mm-dd */
function checkStartDate(value) {
    var v = value.trim();
    if (v === "") {
        return "حقل تاريخ بداية التأجير إلزامي الإدخال.";
    }
    if (parseStrictDate(v) === null) {
        return "يرجى إدخال تاريخ بداية صحيح بالصيغة yyyy-mm-dd (مثال: 2026-11-15).";
    }
    return "";
}

/* 4. التحقق من تاريخ نهاية التأجير: إلزامي وبصيغة yyyy-mm-dd ولاحق لتاريخ البداية */
function checkEndDate(value) {
    var v = value.trim();
    if (v === "") {
        return "حقل تاريخ نهاية التأجير إلزامي الإدخال.";
    }
    var endDate = parseStrictDate(v);
    if (endDate === null) {
        return "يرجى إدخال تاريخ نهاية صحيح بالصيغة yyyy-mm-dd.";
    }
    var startDate = parseStrictDate($("#startDate").val());
    if (startDate !== null && endDate.getTime() <= startDate.getTime()) {
        return "تاريخ نهاية التأجير يجب أن يكون لاحقاً لتاريخ بداية التأجير.";
    }
    return "";
}

/* 5. التحقق من رقم الموبايل: اختياري، ويطابق شبكتي Syriatel (093,098,099) أو MTN (094,095,096) */
function checkMobile(value) {
    var v = value.replace(/[\s\-]/g, "");
    if (v === "") {
        return "";
    }
    var mobileRegex = /^(?:0|00963|\+963)9[345689]\d{7}$/;
    if (!mobileRegex.test(v)) {
        return "رقم الموبايل يجب أن يطابق شبكة Syriatel (093/098/099) أو MTN (094/095/096).";
    }
    return "";
}

/* تحديد اسم الشبكة لعرضها في ملخص النتيجة */
function getNetworkName(mobileStr) {
    var v = mobileStr.replace(/[\s\-]/g, "");
    var prefix = v.substring(v.length - 9, v.length - 7);
    if (prefix === "93" || prefix === "98" || prefix === "99") {
        return "Syriatel";
    }
    if (prefix === "94" || prefix === "95" || prefix === "96") {
        return "MTN";
    }
    return "";
}

/* 6. التحقق من البريد الإلكتروني: اختياري، وبصيغة بريد صحيحة عند الإدخال */
function checkEmail(value) {
    var v = value.trim();
    if (v === "") {
        return "";
    }
    var emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(v)) {
        return "يرجى إدخال بريد إلكتروني بصيغة صحيحة (مثال: name@example.com).";
    }
    return "";
}

var VALIDATION_RULES = [
    { id: "fullName",   validate: checkFullName },
    { id: "nationalId", validate: checkNationalId },
    { id: "startDate",  validate: checkStartDate },
    { id: "endDate",    validate: checkEndDate },
    { id: "mobile",     validate: checkMobile },
    { id: "email",      validate: checkEmail }
];

/* قراءة السيارات المختارة من الجدول */
function getSelectedCars() {
    var selected = [];
    $("#carsTable input.select-car:checked").each(function () {
        var row = $(this).closest("tr");
        selected.push({
            code: $(this).val(),
            model: row.find("td.model").text(),
            price: parseInt(row.find("td.price span.num").text(), 10)
        });
    });
    return selected;
}

/* عرض السيارات المختارة أعلى نموذج الحجز */
function renderSelectedSummary(cars) {
    var box = $("#selectedSummary");
    box.empty();
    box.append($("<strong/>").text("السيارات المختارة للحجز:"));
    var ul = $("<ul/>");
    for (var i = 0; i < cars.length; i++) {
        ul.append(
            $("<li/>").text(
                cars[i].code + " - " + cars[i].model + " (السعر اليومي: " + formatCurrency(cars[i].price) + " ل.س)"
            )
        );
    }
    box.append(ul);
}

/* حساب أيام التأجير والمجموع والخصم والمبلغ النهائي */
function calculateRentalCost(cars, days) {
    var items = [];
    var totalBeforeDiscount = 0;

    for (var i = 0; i < cars.length; i++) {
        var carCost = cars[i].price * days;
        totalBeforeDiscount += carCost;
        items.push({
            code: cars[i].code,
            model: cars[i].model,
            dailyPrice: cars[i].price,
            days: days,
            subtotal: carCost
        });
    }

    var discountAmount = 0;
    if (days > DISCOUNT_THRESHOLD_DAYS) {
        discountAmount = totalBeforeDiscount * DISCOUNT_PERCENT;
    }

    return {
        items: items,
        total: totalBeforeDiscount,
        discount: discountAmount,
        finalTotal: totalBeforeDiscount - discountAmount
    };
}

/* إظهار أو إخفاء رسالة الخطأ لحقل معين */
function validateSingleField(fieldId) {
    for (var i = 0; i < VALIDATION_RULES.length; i++) {
        if (VALIDATION_RULES[i].id === fieldId) {
            var errorMsg = VALIDATION_RULES[i].validate($("#" + fieldId).val());
            $("#" + fieldId + "Error").text(errorMsg);
            $("#" + fieldId).toggleClass("invalid", errorMsg !== "");
            return errorMsg === "";
        }
    }
    return true;
}

/* التحقق الشامل من النموذج عند الضغط على زر إرسال */
function validateBookingForm() {
    var isValid = true;
    var firstErrorField = null;

    for (var i = 0; i < VALIDATION_RULES.length; i++) {
        var id = VALIDATION_RULES[i].id;
        if (!validateSingleField(id)) {
            isValid = false;
            if (firstErrorField === null) {
                firstErrorField = id;
            }
        }
    }

    var cars = getSelectedCars();
    if (cars.length === 0) {
        $("#bookingMsg").text("يرجى اختيار سيارة واحدة على الأقل من الجدول أعلاه.").removeClass("hidden").show();
        isValid = false;
    } else {
        $("#bookingMsg").hide();
    }

    if (!isValid) {
        if (firstErrorField !== null) {
            $("#" + firstErrorField).focus();
        }
        return null;
    }

    var start = parseStrictDate($("#startDate").val());
    var end = parseStrictDate($("#endDate").val());
    var rentalDays = Math.round((end.getTime() - start.getTime()) / ONE_DAY_MS);

    return {
        fullName: $("#fullName").val().trim(),
        nationalId: $("#nationalId").val().trim(),
        startDate: $("#startDate").val().trim(),
        endDate: $("#endDate").val().trim(),
        mobile: $("#mobile").val().trim(),
        email: $("#email").val().trim(),
        branch: $("#branch").val(),
        payment: $("input[name='payment']:checked").val(),
        days: rentalDays,
        cost: calculateRentalCost(cars, rentalDays)
    };
}

/* عرض نافذة النتيجة متضمنة السيارات المختارة وعدد الأيام والمجموع والخصم والمبلغ النهائي */
function displayResultModal(booking) {
    var container = $("#resultBody");
    container.empty();

    if (booking.fullName !== "") {
        container.append($("<p/>").html("<strong>الاسم الكامل:</strong> " + booking.fullName));
    }
    container.append($("<p/>").html("<strong>الرقم الوطني:</strong> " + booking.nationalId));
    container.append($("<p/>").html("<strong>فترة التأجير:</strong> من " + booking.startDate + " إلى " + booking.endDate + " (" + booking.days + " يوم)"));

    if (booking.mobile !== "") {
        container.append($("<p/>").html("<strong>رقم الموبايل:</strong> " + booking.mobile + " (" + getNetworkName(booking.mobile) + ")"));
    }
    if (booking.email !== "") {
        container.append($("<p/>").html("<strong>البريد الإلكتروني:</strong> " + booking.email));
    }
    container.append($("<p/>").html("<strong>فرع الاستلام وطريقة الدفع:</strong> " + booking.branch + " - " + booking.payment));

    var table = $("<table/>").addClass("result-table");
    var thead = $("<thead/>");
    var headerRow = $("<tr/>");
    var headers = ["رمز السيارة", "الموديل", "السعر اليومي", "عدد أيام التأجير", "المجموع الفرعي"];
    for (var h = 0; h < headers.length; h++) {
        headerRow.append($("<th/>").text(headers[h]));
    }
    thead.append(headerRow);
    table.append(thead);

    var tbody = $("<tbody/>");
    for (var i = 0; i < booking.cost.items.length; i++) {
        var item = booking.cost.items[i];
        var tr = $("<tr/>");
        tr.append($("<td/>").text(item.code));
        tr.append($("<td/>").text(item.model));
        tr.append($("<td/>").text(formatCurrency(item.dailyPrice) + " ل.س"));
        tr.append($("<td/>").text(item.days + " يوم"));
        tr.append($("<td/>").text(formatCurrency(item.subtotal) + " ل.س"));
        tbody.append(tr);
    }
    table.append(tbody);
    container.append(table);

    container.append($("<p/>").html("<strong>المجموع قبل الخصم:</strong> " + formatCurrency(booking.cost.total) + " ل.س"));

    if (booking.cost.discount > 0) {
        container.append(
            $("<p/>").addClass("discount-line").text(
                "قيمة الخصم (10% لتجاوز مدة التأجير 7 أيام): - " + formatCurrency(booking.cost.discount) + " ل.س"
            )
        );
    } else {
        container.append(
            $("<p/>").text("قيمة الخصم: 0 ل.س (الخصم 10% يطبق عند تجاوز مدة التأجير 7 أيام)")
        );
    }

    container.append(
        $("<p/>").addClass("final-amount").text(
            "المبلغ الإجمالي النهائي: " + formatCurrency(booking.cost.finalTotal) + " ل.س"
        )
    );

    $("#resultOverlay").removeClass("hidden").fadeIn(200);
}

/* إمكانية الخروج من الموقع */
function handleSiteExit() {
    if (window.confirm("هل ترغب بالخروج من موقع مكتب الشام لتأجير السيارات؟")) {
        window.close();
        $("body").html(
            '<div class="goodbye">' +
            '<h1>شكراً لزيارتكم مكتب الشام لتأجير السيارات</h1>' +
            '<p>تم تسجيل الخروج بنجاح. للعودة إلى الصفحة الرئيسية اضغط على الرابط أدناه:</p>' +
            '<p><a href="home.html">العودة إلى الصفحة الرئيسية</a></p>' +
            '</div>'
        );
    }
}

/* تفعيل الأحداث باستخدام مكتبة jQuery عند جاهزية الصفحة */
$(document).ready(function () {

    $("a.exit-link").on("click", function (e) {
        e.preventDefault();
        handleSiteExit();
    });

    if ($("#carsTable").length === 0) {
        return;
    }

    /* إظهار وإخفاء تفاصيل السيارة باستخدام jQuery مع دعم إظهار عدة سيارات معاً */
    $("#carsTable").on("change", "input.show-details", function () {
        var carCode = $(this).val();
        var detailsRow = $("#rowDetails-" + carCode);
        if (this.checked) {
            detailsRow.removeClass("hidden").slideDown(200);
        } else {
            detailsRow.slideUp(200);
        }
    });

    /* تمييز صف السيارة عند تحديد مربع الاختيار */
    $("#carsTable").on("change", "input.select-car", function () {
        $(this).closest("tr").toggleClass("selected", this.checked);
        if (getSelectedCars().length > 0) {
            $("#selectionMsg").hide();
            if ($("#bookingSection").is(":visible")) {
                renderSelectedSummary(getSelectedCars());
            }
        }
    });

    /* عند الضغط على زر متابعة يظهر نموذج الحجز في نفس الصفحة */
    $("#continueBtn").on("click", function () {
        var selectedCars = getSelectedCars();
        if (selectedCars.length === 0) {
            $("#selectionMsg").text("يرجى اختيار سيارة واحدة على الأقل من الجدول قبل الضغط على متابعة.").removeClass("hidden").fadeIn(200);
            $("#bookingSection").slideUp(200);
            return;
        }

        $("#selectionMsg").hide();
        renderSelectedSummary(selectedCars);
        $("#bookingSection").removeClass("hidden").slideDown(300);
        $("html, body").animate({
            scrollTop: $("#bookingSection").offset().top - 15
        }, 350);
    });

    /* التحقق الفوري عند مغادرة الحقول */
    for (var i = 0; i < VALIDATION_RULES.length; i++) {
        $("#" + VALIDATION_RULES[i].id).on("blur", function () {
            validateSingleField($(this).attr("id"));
        });
    }

    $("#startDate").on("blur", function () {
        if ($("#endDate").val().trim() !== "") {
            validateSingleField("endDate");
        }
    });

    /* معالجة إرسال نموذج الحجز */
    $("#bookingForm").on("submit", function (e) {
        e.preventDefault();
        var bookingResult = validateBookingForm();
        if (bookingResult !== null) {
            displayResultModal(bookingResult);
        }
    });

    /* مسح رسائل الخطأ عند إعادة تعيين النموذج */
    $("#bookingForm").on("reset", function () {
        $("#bookingForm .error").text("");
        $("#bookingForm input.invalid").removeClass("invalid");
        $("#bookingMsg").hide();
    });

    /* إغلاق نافذة النتيجة */
    $("#closeResult").on("click", function () {
        $("#resultOverlay").fadeOut(200);
    });

    $("#resultOverlay").on("click", function (e) {
        if (e.target === this) {
            $("#resultOverlay").fadeOut(200);
        }
    });
});
