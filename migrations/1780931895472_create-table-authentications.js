exports.up = (pgm) => {
  pgm.createTable('authentications', {
    token: { type: 'text', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('authentications');
};