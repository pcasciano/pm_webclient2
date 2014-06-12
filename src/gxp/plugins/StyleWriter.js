Ext.define('gxp.plugins.StyleWriter', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    deletedStyles: null,
    constructor: function(config) {
        this.initialConfig = config;
        Ext.apply(this, config);
        this.deletedStyles = [];
        this.mixins.observable.constructor.call(this, config);
    },
    init: function(target) {
        this.target = target;

        // keep track of removed style records, because Ext.Store does not.
        target.stylesStore.on({
            "remove": function(store, record, index) {
                var styleName = record.get("name");
                // only proceed if the style comes from the server
                record.get("name") === styleName &&
                    this.deletedStyles.push(styleName);
            },
            scope: this
        });

        target.on({
            "beforesaved": this.write,
            scope: this
        });
    },
    write: function(target, options) {
        target.stylesStore.commitChanges();
        target.fireEvent("saved", target, target.selectedStyle.get("name"));
    }
});
