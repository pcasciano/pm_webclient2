Ext.define('PM.controller.PanelFase2', {

    extend: 'Ext.app.Controller',

    //requires: ['PM.view.PanelFase2'],

    views:['PanelFase2'],

    init: function(){
        this.control({
            'panelFase2':{
              //  afterrender: this.onBeforeRender
            }
        });
    },

    beforeRender: function(o, eopts){
        alert('bef rend');
    }

});
