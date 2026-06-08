exports.up = (pgm) => {
  pgm.createTable('profiles', {
    id: { type: 'varchar(50)', primaryKey: true },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    full_name: { type: 'varchar(255)', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('profiles');
};