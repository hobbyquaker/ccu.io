CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `val` text NOT NULL,
  `ack` tinyint(1) NOT NULL,
  `timestamp` datetime NOT NULL,
  `lastchange` datetime NOT NULL,
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;