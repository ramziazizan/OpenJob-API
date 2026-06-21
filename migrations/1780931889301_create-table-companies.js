exports.up = (pgm) => {
  pgm.createTable('companies', {
    id: { type: 'varchar(50)', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    location: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('companies');
};