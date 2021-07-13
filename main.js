
var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'Gems');

game.state.add('MainMenu', Game.MainMenu);
game.state.add('level1', Game.level1);
game.state.start('MainMenu');

var Game;
let GEM_SIZE = 100;
let GEM_SPACING = 2;
let GEM_SIZE_SPACED = GEM_SIZE + GEM_SPACING;
let BOARD_COLS;
let BOARD_ROWS;
let MATCH_MIN = 3;
let MATCH = 4;
let gems;
let selectedGem = null;
let selectedGemStartPos;
let selectedGemTween;
let tempShiftedGem = null;
let allowInput;
let score = 0;
let scoreText;
let startButton;
let bgm;
let killM;
let shadows;

function releaseGem() {

    if (tempShiftedGem === null) {
        selectedGem = null;
        return;
    }


    // коли миша звільняється з вибраним gem
    // 1) перевірка на збіги
    // 2) видаляють підібрані дорогоцінні камені
    // 3) випадають дорогоцінні камені вище видалених дорогоцінних каменів
    // 4) поповнення плати

    let canKill = checkAndKillGemMatches(selectedGem);
    canKill = checkAndKillGemMatches(tempShiftedGem) || canKill;

    if (! canKill) // не існує жодних збігів, тому замінюйте дорогоцінні камені назад на початкові позиції
    {
        let gem = selectedGem;

        if (gem.posX !== selectedGemStartPos.x || gem.posY !== selectedGemStartPos.y)
        {
            if (selectedGemTween !== null)
            {
                game.tweens.remove(selectedGemTween);
            }

            selectedGemTween = tweenGemPos(gem, selectedGemStartPos.x, selectedGemStartPos.y);

            if (tempShiftedGem !== null)
            {
                tweenGemPos(tempShiftedGem, gem.posX, gem.posY);
            }

            swapGemPosition(gem, tempShiftedGem);

            tempShiftedGem = null;

        }
    }

    removeKilledGems();


    let dropGemDuration = dropGems();

// затримка дошки зарядки, поки всі існуючі дорогоцінні камені не впали
    game.time.events.add(dropGemDuration * 100, refillBoard);

    allowInput = false;

    selectedGem = null;
    tempShiftedGem = null;

}

function slideGem(pointer, x, y) {

    // перевіряємо, чи слід перемістити вибраний камінь і зробити це

    if (selectedGem && pointer.isDown)
    {
        let cursorGemPosX = getGemPos(x);
        let cursorGemPosY = getGemPos(y);

        if (checkIfGemCanBeMovedHere(selectedGemStartPos.x, selectedGemStartPos.y, cursorGemPosX, cursorGemPosY))
        {
            if (cursorGemPosX !== selectedGem.posX || cursorGemPosY !== selectedGem.posY)
            {
                // move currently selected gem
                if (selectedGemTween !== null)
                {
                    game.tweens.remove(selectedGemTween);
                }

                selectedGemTween = tweenGemPos(selectedGem, cursorGemPosX, cursorGemPosY);

                gems.bringToTop(selectedGem);


                // якщо ми перемістили дорогоцінний камінь, щоб створити місце для вибраного каменя раніше, перемістіть його назад у вихідне положення
                if (tempShiftedGem !== null)
                {
                    tweenGemPos(tempShiftedGem, selectedGem.posX , selectedGem.posY);
                    swapGemPosition(selectedGem, tempShiftedGem);

                }

                // коли гравець переміщує вибраний камінь, нам потрібно поміняти позицію обраного каменя з першим у цій позиції
                tempShiftedGem = getGem(cursorGemPosX, cursorGemPosY);

                if (tempShiftedGem === selectedGem)
                {
                    tempShiftedGem = null;
                }
                else
                {
                    tweenGemPos(tempShiftedGem, selectedGem.posX, selectedGem.posY);
                    swapGemPosition(selectedGem, tempShiftedGem);
                }
            }
        }
    }
}

// заповнити екран якомога більше знаків
function spawnBoard() {

    BOARD_COLS = Math.floor(game.world.width / GEM_SIZE_SPACED - 1);
    BOARD_ROWS = Math.floor(game.world.height / GEM_SIZE_SPACED);

    shadows = game.add.group();
    gems = game.add.group();

    for (let i = 0; i < BOARD_COLS; i++)
    {
        for (let j = 0; j < BOARD_ROWS; j++)
        {
            let shadow = shadows.create(i * GEM_SIZE_SPACED, j * GEM_SIZE_SPACED, "shadows");
            let gem = gems.create(i * GEM_SIZE_SPACED, j * GEM_SIZE_SPACED, "GEMS");




            gem.name = 'gem' + i.toString() + 'x' + j.toString();
            gem.inputEnabled = true;
            gem.events.onInputDown.add(selectGem, this);
            gem.events.onInputUp.add(releaseGem, this);
            randomizeGemColor(gem);
            setGemPos(gem, i, j);// кожен гем має позицію на дошці
            gem.kill();
        }
    }

    removeKilledGems();

    let dropGemDuration = dropGems();

    // затримка дошки зарядки, поки всі існуючі дорогоцінні камені не впали
    game.time.events.add(dropGemDuration * 100, refillBoard);

    allowInput = false;

    selectedGem = null;
    tempShiftedGem = null;

    // refillBoard();
}

// вибрати дорогоцінний камінь і запам'ятати його початкову позицію
function selectGem(gem) {

    if (allowInput)
    {
        selectedGem = gem;
        selectedGemStartPos.x = gem.posX;
        selectedGemStartPos.y = gem.posY;

    }

}


// знайти дорогоцінний камінь на дошці відповідно до його положення на дошці
function getGem(posX, posY) {

    return gems.iterate("id", calcGemId(posX, posY), Phaser.Group.RETURN_CHILD);

}

// конвертувати координати світу в положення дошки
function getGemPos(coordinate) {

    return Math.floor(coordinate / GEM_SIZE_SPACED);

}

// встановлюємо позицію на дошці для gem
function setGemPos(gem, posX, posY) {

    gem.posX = posX;
    gem.posY = posY;
    gem.id = calcGemId(posX, posY);

}


// id gem використовується getGem () для пошуку конкретних дорогоцінних каменів у групі
// кожна позиція на платі має унікальний ідентифікатор
function calcGemId(posX, posY) {

    return posX + posY * BOARD_COLS;

}

// оскільки дорогоцінні камені є спрайт-лист, їх колір такий же, як і поточний номер кадру

function getGemColor(gem) {

    return gem.frame;

}

// встановити gemsprite у випадковий кадр
function randomizeGemColor(gem) {

    gem.frame = game.rnd.integerInRange(0, gem.animations.frameTotal - 1);

}

// Дорогоцінні камені можна переміщати лише 1 квадрат вгору / вниз або вліво / вправо
function checkIfGemCanBeMovedHere(fromPosX, fromPosY, toPosX, toPosY) {

    if (toPosX < 0 || toPosX >= BOARD_COLS || toPosY < 0 || toPosY >= BOARD_ROWS)
    {
        return false;
    }

    if (fromPosX === toPosX && fromPosY >= toPosY - 1 && fromPosY <= toPosY + 1)
    {
        return true;
    }

    if (fromPosY === toPosY && fromPosX >= toPosX - 1 && fromPosX <= toPosX + 1)
    {
        return true;
    }

    return false;
}


// підрахувати, скільки дорогоцінних каменів одного кольору лежать в заданому напрямку
// наприклад, якщо moveX = 1 і moveY = 0, то підрахувати, скільки дорогоцінних каменів одного кольору лежать праворуч від каменя
// припиняє підрахунок, як тільки зустрічається перлинка іншого кольору або кінця плати
function countSameColorGems(startGem, moveX, moveY) {

    let curX = startGem.posX + moveX;
    let curY = startGem.posY + moveY;
    let count = 0;

    while (curX >= 0 && curY >= 0 && curX < BOARD_COLS && curY < BOARD_ROWS && getGemColor(getGem(curX, curY)) === getGemColor(startGem))
    {
        count++;
        curX += moveX;
        curY += moveY;
    }

    return count;

}

// поміняємо положення 2 каменів, коли гравець перетягує вибраний камінь у нове місце
function swapGemPosition(gem1, gem2) {

    let tempPosX = gem1.posX;
    let tempPosY = gem1.posY;
    setGemPos(gem1, gem2.posX, gem2.posY);
    setGemPos(gem2, tempPosX, tempPosY);

}

// підрахуйте, скільки дорогоцінних каменів одного кольору знаходяться вище, нижче, ліворуч і праворуч
// якщо більше 3 збігаються горизонтально або вертикально, вбийте ці дорогоцінні камені
// якщо жодного збігу не було зроблено, перемістіть дорогоцінні камені назад у свої початкові позиції
function checkAndKillGemMatches(gem) {



    if (gem === null) { return; }

    let canKill = false;

// обробляємо вибраний камень

    let countUp = countSameColorGems(gem, 0, -1);
    let countDown = countSameColorGems(gem, 0, 1);
    let countLeft = countSameColorGems(gem, -1, 0);
    let countRight = countSameColorGems(gem, 1, 0);

    let countHoriz = countLeft + countRight + 1;
    let countVert = countUp + countDown + 1;

    if (countVert == MATCH_MIN)
    {
        killGemRange(gem.posX, gem.posY - countUp, gem.posX, gem.posY + countDown);
        score+=3;
        scoreText.text = ' ' + score;
        canKill = true;
        killM.play();
    }
    if (countVert >= MATCH)
    {
        killGemRange(gem.posX, gem.posY - countUp, gem.posX, gem.posY + countDown);
        score+=6;
        scoreText.text = ' ' + score;
        canKill = true;
        killM.play();
    }

    if (countHoriz >= MATCH)
    {
        killGemRange(gem.posX - countLeft, gem.posY, gem.posX + countRight, gem.posY);
        score+=6;
        scoreText.text = ' ' + score;
        canKill = true;
        killM.play();
    }
    if (countHoriz == MATCH_MIN)
    {
        killGemRange(gem.posX - countLeft, gem.posY, gem.posX + countRight, gem.posY);
        score+=3;
        scoreText.text = ' ' + score;
        canKill = true;
        killM.play();
    }


    return canKill;

}

// вбивати всі дорогоцінні камені з початкової позиції до кінцевої позиції
function killGemRange(fromX, fromY, toX, toY) {

    fromX = Phaser.Math.clamp(fromX, 0, BOARD_COLS - 1);
    fromY = Phaser.Math.clamp(fromY , 0, BOARD_ROWS - 1);
    toX = Phaser.Math.clamp(toX, 0, BOARD_COLS - 1);
    toY = Phaser.Math.clamp(toY, 0, BOARD_ROWS - 1);

    for (let i = fromX; i <= toX; i++)
    {
        for (let j = fromY; j <= toY; j++)
        {
            let gem = getGem(i, j);
            gem.kill();
        }
    }
}

// переміщуємо дорогоцінні камені, які були вбиті з дошки
function removeKilledGems() {

    gems.forEach(function(gem) {
        if (!gem.alive) {
            setGemPos(gem, -1,-1);
        }
    });

}

// рух анімаційного каменя
function tweenGemPos(gem, newPosX, newPosY, durationMultiplier) {

    console.log('Tween ',gem.name,' from ',gem.posX, ',', gem.posY, ' to ', newPosX, ',', newPosY);
    if (durationMultiplier === null || typeof durationMultiplier === 'undefined')
    {
        durationMultiplier = 1;
    }

    return game.add.tween(gem).to({x: newPosX  * GEM_SIZE_SPACED, y: newPosY * GEM_SIZE_SPACED}, 100 * durationMultiplier, Phaser.Easing.Linear.None, true);

}

// шукати дорогоцінні камені з порожнім простором і переміщати їх вниз
function dropGems() {

    let dropRowCountMax = 0;

    for (let i = 0; i < BOARD_COLS; i++)
    {
        let dropRowCount = 0;

        for (let j = BOARD_ROWS - 1; j >= 0; j--)
        {
            let gem = getGem(i, j);

            if (gem === null)
            {
                dropRowCount++;
            }
            else if (dropRowCount > 0)
            {
                gem.dirty = true;
                setGemPos(gem, gem.posX, gem.posY + dropRowCount);
                tweenGemPos(gem, gem.posX, gem.posY, dropRowCount);
            }
        }

        dropRowCountMax = Math.max(dropRowCount, dropRowCountMax);
    }

    return dropRowCountMax;

}

// шукати будь-які порожні плями на дошці і створювати нові камені на їх місці, які падають зверху
function refillBoard() {

    let maxGemsMissingFromCol = 0;

    for (let i = 0; i < BOARD_COLS; i++)
    {
        let gemsMissingFromCol = 0;

        for (let j = BOARD_ROWS - 1; j >= 0; j--)
        {
            let gem = getGem(i, j);

            if (gem === null)
            {
                gemsMissingFromCol++;
                gem = gems.getFirstDead();
                gem.reset(i * GEM_SIZE_SPACED, -gemsMissingFromCol * GEM_SIZE_SPACED);
                gem.dirty = true;
                randomizeGemColor(gem);
                setGemPos(gem, i, j);
                tweenGemPos(gem, gem.posX, gem.posY, gemsMissingFromCol * 2);
            }
        }

        maxGemsMissingFromCol = Math.max(maxGemsMissingFromCol, gemsMissingFromCol);
    }

    game.time.events.add(maxGemsMissingFromCol * 2 * 100, boardRefilled);

}

// Коли плата закінчила заправку, знову ввімкніть вхід гравця
function boardRefilled() {
    let canKill = false;
    for (let i = 0; i < BOARD_COLS; i++)
    {
        for (let j = BOARD_ROWS - 1; j >= 0; j--)
        {
            let gem = getGem(i, j);

            if (gem.dirty)
            {
                gem.dirty = false;
                canKill = checkAndKillGemMatches(gem) || canKill;
            }
        }
    }

    if(canKill){
            score+=3;
            scoreText.text = ' ' + score;
        removeKilledGems();
        let dropGemDuration = dropGems();
        // delay board refilling until all existing gems have dropped down
        game.time.events.add(dropGemDuration * 100, refillBoard);
        allowInput = false;
    } else {
        allowInput = true;
    }
}
