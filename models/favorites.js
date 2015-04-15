"use strict";

module.exports = function(sequelize, DataTypes) {
  var Favorites = sequelize.define("Favorites", {
    company_id: DataTypes.STRING,
    user_id: DataTypes.INTEGER
  }, {

 //*************************************************
    //IS THIS OKAY??
    
    classMethods: {
      associate: function(models) {
      //  this.belongsTo(models.User);
      }
    }
//*************************************************

  });
  return Favorites;
};