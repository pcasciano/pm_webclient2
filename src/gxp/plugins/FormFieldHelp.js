Ext.define('gxp.plugins.FormFieldHelp', {
    extend: 'Object',
    alias: 'plugin.gxp_formfieldhelp',
    helpText: null,
    dismissDelay: 5000,
    constructor: function(config) {
        Ext.apply(this, config);
    },
    init: function(target){
        this.target = target;
        target.on('render', this.showHelp, this);
    },
    showHelp: function() {
        var target;
        if (this.target.label) {
            target = this.target.label;
        } else {
            target = this.target.getEl();
        }
        Ext.QuickTips.register({
            target: target,
            dismissDelay: this.dismissDelay,
            text: this.helpText
        });
    }
});
