exports.up = (pgm) => {
  pgm.createTable('applications', {
    id: { type: 'varchar(50)', primaryKey: true },
    job_id: { type: 'varchar(50)', references: 'jobs(id)', onDelete: 'CASCADE' },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    status: { type: 'varchar(20)', default: 'pending' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('applications');
};