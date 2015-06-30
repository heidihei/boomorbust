'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    migration.addColumn(
      'Favorites',
      'company_name',
      DataTypes.STRING
    );
  },

  down: function (queryInterface, Sequelize) {
    migration.removeColumn(
        'Favorites',
        'company_name'
      );
  }
};
