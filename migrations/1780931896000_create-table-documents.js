exports.up = (pgm) => {
  pgm.createTable('documents', {
    id: { type: 'varchar(50)', primaryKey: true },
    filename: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('documents');
};
