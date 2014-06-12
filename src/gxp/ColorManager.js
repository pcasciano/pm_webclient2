/**
 * @requires form/field/Color.js
 */

Ext.namespace("gxp");

Ext.require('Ext.ColorPalette');
Ext.require('Ext.Window');

gxp.ColorManager = function(config) {
    Ext.apply(this, config);
};

Ext.apply(gxp.ColorManager.prototype, {
    field: null,
    init: function(field) {
        this.register(field);
    },
    destroy: function() {
        if(this.field) {
            this.unregister(this.field);
        }
    },
    register: function(field) {
        if(this.field) {
            this.unregister(this.field);
        }
        this.field = field;
        field.on({
            focus: this.fieldFocus,
            destroy: this.destroy,
            scope: this
        });
    },
    unregister: function(field) {
        field.un("focus", this.fieldFocus, this);
        field.un("destroy", this.destroy, this);
        if(gxp.ColorManager.picker && field == this.field) {
            gxp.ColorManager.picker.un("pickcolor", this.setFieldValue, this);
        }
        this.field = null;
    },
    fieldFocus: function(field) {
        if(!gxp.ColorManager.pickerWin) {
            gxp.ColorManager.picker = Ext.create('Ext.ColorPalette');
            gxp.ColorManager.pickerWin = Ext.create('Ext.Window', {
                title: "Color Picker",
                closeAction: "hide",
                autoWidth: true,
                autoHeight: true
            });
        }
        var listenerCfg = {
            select: this.setFieldValue,
            scope: this
        };
        var value = this.getPickerValue();
        if (value) {
            var colors = [].concat(gxp.ColorManager.picker.colors);
            if (!~colors.indexOf(value)) {
                if (gxp.ColorManager.picker.ownerCt) {
                    gxp.ColorManager.pickerWin.remove(gxp.ColorManager.picker);
                    gxp.ColorManager.picker = Ext.create('Ext.ColorPalette');
                }
                colors.push(value);
                gxp.ColorManager.picker.colors = colors;
            }
            gxp.ColorManager.pickerWin.add(gxp.ColorManager.picker);
            gxp.ColorManager.pickerWin.doLayout();
            if (gxp.ColorManager.picker.rendered) {
                gxp.ColorManager.picker.select(value);
            } else {
                listenerCfg.afterrender = function() {
                    gxp.ColorManager.picker.select(value);
                };
            }
        }
        gxp.ColorManager.picker.on(listenerCfg);
        gxp.ColorManager.pickerWin.show();
    },
    setFieldValue: function(picker, color) {
        if(this.field.isVisible()) {
            this.field.setValue("#" + color);
        }
    },
    getPickerValue: function() {
        var field = this.field;
        var hex = field.getHexValue ?
            (field.getHexValue() || field.defaultBackground) :
            field.getValue();
        if (hex) {
            return hex.substr(1);
        }
    }
    
});

(function() {
    // register the color manager with every color field
    Ext.util.Observable.observeClass(gxp.form.field.Color);
    gxp.form.field.Color.on({
        render: function(field) {
            var manager = Ext.create('gxp.ColorManager');
            manager.register(field);
        }
    });
})();

gxp.ColorManager.picker = null;

gxp.ColorManager.pickerWin = null;
