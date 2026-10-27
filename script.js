// 꽃을 피우기까지 기다리는 시간을 기억합니다.
var bloomTimer;
var snakeTimer;

$('.open-button').on('click', function () {
    $('.poster').addClass('open');
    // 문이 약 1/3 열린 960밀리초(0.96초)에 꽃을 피웁니다.
    bloomTimer = setTimeout(function () {
        $('.poster').addClass('bloom');
        // 1.3초 ease-out 꽃 애니메이션이 약 절반 크기로 폈을 때 출발합니다.
        snakeTimer = setTimeout(startSnake, 430);
    }, 960);
    $('.close-edge').prop('hidden', false);
    $('.edge-left').focus();
});

// 꽃은 다 핀 상태로 두고 문만 닫습니다.
$('.close-edge').on('click', function () {
    clearTimeout(bloomTimer);
    clearTimeout(snakeTimer);
    cancelAnimationFrame(snakeFrame);
    drawSnake(1);
    $('.poster').addClass('settled closing').removeClass('open');
    $('.close-edge').prop('hidden', true);
});

// 꽃이 문에 완전히 가려진 뒤에만 다음 재생을 준비합니다.
$('.door.left').on('transitionend', function () {
    if ($('.poster').hasClass('closing')) {
        $('.poster').removeClass('bloom settled closing');
        clearSnake();
        $('.character-group').removeClass('revealed');
        $('.title-hit').attr('aria-expanded', 'false');
        $('.open-button').focus();
    }
});

// 뱀은 꽃 위, 인물 누끼 아래의 한 화면에 이어서 그립니다.
var snakePicture = new Image();
snakePicture.src = 'snake.png';
var snakeCanvases = document.querySelectorAll('.snake-canvas');
var snakeBack = snakeCanvases[0].getContext('2d');
var snakeFrame;

function clearSnake() {
    snakeBack.clearRect(0, 0, 1672, 941);
}

// 초록 화살표처럼 올라갔다 내려오고, 오른쪽에서 돌아 왼쪽을 봅니다.
var snakeRoute = document.createElementNS('http://www.w3.org/2000/svg', 'path');
snakeRoute.setAttribute('d', 'M-240 500 C-90 520 85 475 175 390 C245 305 95 295 105 215 C115 155 185 90 245 50 C300 10 330 -30 430 -42 C490 -56 565 -50 620 -25 C655 -10 675 -2 700 10 C770 25 845 55 900 73 C950 85 980 90 1000 95 C1050 110 1140 155 1200 135 C1260 115 1300 75 1370 70 C1430 65 1510 140 1540 170 C1580 210 1630 225 1680 250 C1740 290 1580 330 1500 310 C1460 300 1430 300 1410 300');
var routeLength = snakeRoute.getTotalLength();
// 경로 좌표와 방향은 처음 한 번만 계산해 재생 중 계산을 줄입니다.
var routeSamples = [];
for (var d = 0; d <= Math.ceil(routeLength); d += 2) {
    var point = snakeRoute.getPointAtLength(Math.min(d, routeLength));
    var before = snakeRoute.getPointAtLength(Math.max(0, d - 2));
    var after = snakeRoute.getPointAtLength(Math.min(routeLength, d + 2));
    routeSamples.push({ x: point.x, y: point.y,
        angle: Math.atan2(after.y - before.y, after.x - before.x) });
}
var snakeCenters = [];
var snakeSlices = [];
snakePicture.onload = function () {
    // 투명 이미지의 각 세로줄에서 실제 몸통 중심을 찾습니다.
    var helper = document.createElement('canvas');
    helper.width = snakePicture.naturalWidth;
    helper.height = snakePicture.naturalHeight;
    var context = helper.getContext('2d', { willReadFrequently: true });
    context.drawImage(snakePicture, 0, 0);
    var pixels = context.getImageData(0, 0, helper.width, helper.height).data;
    for (var x = 0; x < helper.width; x++) {
        var total = 0;
        var weight = 0;
        for (var y = 0; y < helper.height; y++) {
            var alpha = pixels[(y * helper.width + x) * 4 + 3];
            total += y * alpha;
            weight += alpha;
        }
        snakeCenters[x] = weight ? total / weight : helper.height / 2;
    }
    // 몸 중심의 작은 픽셀 차이를 평균내어 떨림을 줄입니다.
    for (var x = 0; x < helper.width; x += 3) {
        var center = 0;
        var count = 0;
        for (var k = Math.max(0, x - 5); k <= Math.min(helper.width - 1, x + 5); k++) {
            center += snakeCenters[k];
            count++;
        }
        var top = helper.height;
        var bottom = 0;
        for (var y = 0; y < helper.height; y++) {
            if (pixels[(y * helper.width + x) * 4 + 3] > 2) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
        if (bottom > top) snakeSlices.push({ x: x, center: center / count,
            top: Math.max(0, top - 3), bottom: Math.min(helper.height, bottom + 4) });
    }
};

function drawSnake(progress) {
    clearSnake();
    if (!snakeCenters.length) return;
    var headDistance = routeLength * (1 - Math.pow(1 - progress, 1.15));
    // 마지막에도 꼬리가 왼쪽 진입 지점에 남도록 전체 경로만큼 늘립니다.
    var bodyLength = routeLength - 35;
    var scale = 0.72;
    for (var i = 0; i < snakeSlices.length; i++) {
        var slice = snakeSlices[i];
        var distance = headDistance - (1 - slice.x / snakePicture.naturalWidth) * bodyLength;
        if (distance < 0) continue;
        var index = Math.min(Math.floor(distance / 2), routeSamples.length - 2);
        var fraction = Math.min(1, distance / 2 - index);
        var a = routeSamples[index];
        var b = routeSamples[index + 1];
        var angleDifference = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
        snakeBack.save();
        snakeBack.translate(a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction);
        snakeBack.rotate(a.angle + angleDifference * fraction);
        var sourceWidth = Math.min(4.5, snakePicture.naturalWidth - slice.x);
        // 꼬리 끝은 가늘게 시작해 몸통으로 부드럽게 굵어집니다.
        var tail = Math.min(1, Math.max(0, (slice.x - 18) / 350));
        var thickness = scale * (0.006 + 0.994 * tail * tail * (3 - 2 * tail));
        snakeBack.drawImage(snakePicture, slice.x, slice.top, sourceWidth,
            slice.bottom - slice.top, 0, (slice.top - slice.center) * thickness,
            sourceWidth / snakePicture.naturalWidth * bodyLength, (slice.bottom - slice.top) * thickness);
        snakeBack.restore();
    }
    hideSnakeBehindLeaves();
}

// 꽃 배치는 그대로 두고, 뱀이 일부 꽃과 잎 뒤로 드나들게 가립니다.
var weavingFlowers = [1, 2, 15, 25, 26, 35].map(function (number) {
    return document.querySelector('.flower-stage .flower-' + number);
});
function hideSnakeBehindLeaves() {
    snakeBack.save();
    snakeBack.globalCompositeOperation = 'destination-out';
    weavingFlowers.forEach(function (flower) {
        var picture = flower.querySelector('img');
        if (!picture.complete) return;
        var ratio = 1672 / flower.parentElement.offsetWidth;
        var width = flower.offsetWidth;
        var height = flower.offsetHeight;
        var outer = new DOMMatrix(getComputedStyle(flower).transform);
        var inner = new DOMMatrix(getComputedStyle(picture).transform);
        var wind = new DOMMatrix(getComputedStyle(picture.parentElement).transform);
        snakeBack.save();
        snakeBack.translate((flower.offsetLeft + width / 2) * ratio,
            (flower.offsetTop + height / 2) * ratio);
        snakeBack.scale(ratio, ratio);
        snakeBack.transform(outer.a, outer.b, outer.c, outer.d, 0, 0);
        snakeBack.transform(wind.a, wind.b, wind.c, wind.d, 0, 0);
        snakeBack.transform(inner.a, inner.b, inner.c, inner.d, 0, 0);
        snakeBack.drawImage(picture, -width / 2, -height / 2, width, height);
        snakeBack.restore();
    });
    snakeBack.restore();
}

function startSnake() {
    cancelAnimationFrame(snakeFrame);
    var started;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function move(now) {
        if (started === undefined) started = now;
        var progress = reducedMotion ? 1 : Math.min((now - started) / 3500, 1);
        drawSnake(progress);
        if (progress < 1) snakeFrame = requestAnimationFrame(move);
    }
    snakeFrame = requestAnimationFrame(move);
}

// 아 → 2번, 가 → 3번, 씨 → 1번을 각각 보여줍니다.
$('.title-hit').on('click', function () {
    var number = $(this).attr('data-character');
    $('#character-' + number).addClass('revealed');
    $(this).attr('aria-expanded', 'true');
});
