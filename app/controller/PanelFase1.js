Ext.define('PM.controller.PanelFase1', {

    extend: 'Ext.app.Controller',

    //requires: ['PM.view.PanelFase1'],

    views:['PanelFase1'],

    init: function(){
        this.control({
            'panelFase1':{
              //  afterrender: this.onBeforeRender
            }
        });
    },

    beforeRender: function(o, eopts){
        alert('bef rend');
    }

});
