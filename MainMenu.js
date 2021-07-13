var Game = {};

Game.MainMenu = function(game){
    let bgm;
    let play;
};

Game.MainMenu.prototype = {
    preload: function(){
        game.load.image('background', 'assets/backgrounds/background.jpg');
        game.load.image('play', 'assets/btn-play.png');
        game.load.image('pausem', 'assets/btn-sfx.png');

        game.load.audio('bgm', 'assets/audio/background.mp3');
    },
    create: function(){
        game.add.image(0, 0, 'background');

        play = game.add.button(250,200, 'play');
        play.inputEnabled = true;
        play.events.onInputDown.add(this.onClick, this);

        bgm = game.add.audio('bgm');
        bgm.loop = true;
        bgm.playOnce = true;
        bgm.play();
    },
    onClick: function(){
        this.state.start('level1');
    },
};
