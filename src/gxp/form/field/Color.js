Ext.define('gxp.form.field.Color', {
    extend: 'Ext.form.field.Text',
    alias: 'widget.gxp_colorfield',
    cssColors: {
        aqua: "#00FFFF",
        black: "#000000",
        blue: "#0000FF",
        fuchsia: "#FF00FF",
        gray: "#808080",
        green: "#008000",
        lime: "#00FF00",
        maroon: "#800000",
        navy: "#000080",
        olive: "#808000",
        purple: "#800080",
        red: "#FF0000",
        silver: "#C0C0C0",
        teal: "#008080",
        white: "#FFFFFF",
        yellow: "#FFFF00"
    },
    defaultBackground: "#ffffff",
    initComponent: function() {
        if (this.value) {
            this.value = this.hexToColor(this.value);
        }
        this.callParent(arguments);
        // Add the colorField listener to color the field.
        this.on({
            render: this.colorField,
            change: this.colorField,
            scope: this
        });
    },
    isDark: function(hex) {
        var dark = false;
        if(hex) {
            // convert hex color values to decimal
            var r = parseInt(hex.substring(1, 3), 16) / 255;
            var g = parseInt(hex.substring(3, 5), 16) / 255;
            var b = parseInt(hex.substring(5, 7), 16) / 255;
            // use w3C brightness measure
            var brightness = (r * 0.299) + (g * 0.587) + (b * 0.144);
            dark = brightness < 0.5;
        }
        return dark;
    },
    colorField: function() {
        var color = this.colorToHex(this.getValue()) || this.defaultBackground;
        this.inputEl.setStyle({
            "background": color,
            "color": this.isDark(color) ? "#ffffff" : "#000000"
        });
    },
    getHexValue: function() {
        return this.colorToHex(
            gxp.form.field.Color.superclass.getValue.apply(this, arguments));
    },
    getValue: function() {
        var v = this.getHexValue();
        var o = this.initialConfig.value;
        if (v === this.hexToColor(o)) {
            v = o;
        }
        return v;
    },
    setValue: function(value) {
        gxp.form.field.Color.superclass.setValue.apply(this,
            [this.hexToColor(value)]);
    },
    colorToHex: function(color) {
        if (!color) {
            return color;
        }
        var hex;
        if (color.match(/^#[0-9a-f]{6}$/i)) {
            hex = color;
        } else {
            hex = this.cssColors[color.toLowerCase()] || null;
        }
        return hex;
    },
    hexToColor: function(hex) {
        if (!hex) {
            return hex;
        }
        var color = hex;
        for (var c in this.cssColors) {
            if (this.cssColors[c] == color.toUpperCase()) {
                color = c;
                break;
            }
        }
        return color;
    }
});
