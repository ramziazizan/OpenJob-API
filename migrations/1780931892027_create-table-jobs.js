exports.up = (pgm) => {
  pgm.createTable('jobs', {
    id: { type: 'varchar(50)', primaryKey: true },
    company_id: { type: 'varchar(50)', references: 'companies(id)', onDelete: 'CASCADE' },
    category_id: { type: 'varchar(50)', references: 'categories(id)', onDelete: 'CASCADE' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    requirements: { type: 'text' },
    salary: { type: 'varchar(100)' },
    location: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('jobs');
};